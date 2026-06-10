import { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { DispatchQueue } from "@/engine/dispatch";
import { claimJob } from "@/modules/jobs/claim";
import { getHandler } from "@/modules/jobs/handlers";
import { computeBackoff } from "@/core/backoff";
import { publishJobUpdate } from "@/modules/events/events.service";
import { POLL_INTERVAL_MS, RECURRING_INTERVAL_MS } from "@/config/constants";

export class Worker {
  private running = false;

  constructor(
    private readonly id: string,
    private readonly dispatch: DispatchQueue,
  ) {}

  async start(): Promise<void> {
    this.running = true;
    logger.info("Worker started", {
      event: "worker.started",
      workerId: this.id,
    });
    while (this.running) {
      try {
        await this.tick();
      } catch (err) {
        logger.error("Worker loop error", {
          event: "worker.error",
          workerId: this.id,
          error: (err as Error).message,
        });
        await this.sleep(POLL_INTERVAL_MS);
      }
    }
  }

  stop(): void {
    this.running = false;
    logger.info("Worker stopping", {
      event: "worker.stopping",
      workerId: this.id,
    });
  }

  private async tick(): Promise<void> {
    const jobId = await this.dispatch.pop();
    if (!jobId) return;

    const job = await claimJob(jobId, this.id);
    if (!job) {
      logger.info("Job already claimed or cancelled", {
        event: "job.claim_skipped",
        jobId,
        workerId: this.id,
      });
      return;
    }

    logger.info("Job started", {
      event: "job.started",
      jobId: job.id,
      type: job.type,
      workerId: this.id,
    });
    await publishJobUpdate(job);

    try {
      const handler = getHandler(job.type);
      await handler(job.payload);
      await this.onSuccess(job);
    } catch (err) {
      await this.onFailure(job, err as Error);
    }
  }

  private async onSuccess(job: Job): Promise<void> {
    const current = await prisma.job.findUnique({ where: { id: job.id } });
    if (current?.status === "cancelled") {
      logger.info("Cancelled mid-processing; result discarded", {
        event: "job.cancelled",
        jobId: job.id,
      });
      return;
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { status: "completed", lastError: null },
    });
    logger.info("Job completed", {
      event: "job.completed",
      jobId: job.id,
      type: job.type,
    });
    await publishJobUpdate(updated);

    await this.scheduleRecurrence(job);
  }

  private async scheduleRecurrence(job: Job): Promise<void> {
    if (!job.recurringInterval) return;
    const intervalMs = RECURRING_INTERVAL_MS[job.recurringInterval];
    if (!intervalMs) return;

    const next = await prisma.job.create({
      data: {
        type: job.type,
        payload: job.payload as object,
        priority: job.priority,
        recurringInterval: job.recurringInterval,
        scheduledAt: new Date(Date.now() + intervalMs),
      },
    });
    logger.info("Recurring run scheduled", {
      event: "job.recurring_scheduled",
      parentId: job.id,
      nextId: next.id,
    });
    await publishJobUpdate(next);
  }

  private async onFailure(job: Job, error: Error): Promise<void> {
    const attempt = job.retryCount + 1;

    if (attempt >= job.maxRetries) {
      const updated = await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          retryCount: attempt,
          lastError: error.message,
          inDlq: true,
          workerId: null,
          claimedAt: null,
        },
      });
      logger.error("Job moved to DLQ", {
        event: "job.failed",
        jobId: job.id,
        attempt,
        error: error.message,
      });
      await publishJobUpdate(updated);
      return;
    }

    const delay = computeBackoff(attempt);
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "pending",
        retryCount: attempt,
        lastError: error.message,
        scheduledAt: new Date(Date.now() + delay),
        nextRunAt: new Date(Date.now() + delay),
        workerId: null,
        claimedAt: null,
      },
    });
    logger.warn("Retry scheduled", {
      event: "job.retry_scheduled",
      jobId: job.id,
      attempt,
      delayMs: delay,
    });
    await publishJobUpdate(updated);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
