import { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { logger } from "@/utils/logger";
import { MinHeap } from "@/core/heap";
import { makeJobComparator } from "@/core/comparator";
import { areDependenciesMet } from "@/core/dag";
import { DispatchQueue } from "@/engine/dispatch";
import { SCHEDULER_TICK_MS, INFLIGHT_TTL_SECONDS, INFLIGHT_PREFIX } from "@/config/constants";

export class Scheduler {
  private running = false;

  constructor(private readonly dispatch: DispatchQueue) {}

  async start(): Promise<void> {
    this.running = true;
    logger.info("Scheduler started", { event: "scheduler.started" });
    while (this.running) {
      try {
        await this.tick();
      } catch (err) {
        logger.error("Scheduler tick error", {
          event: "scheduler.error",
          code: (err as { code?: string }).code,
          error: String(err),
        });
      }
      await this.sleep(SCHEDULER_TICK_MS);
    }
  }

  stop(): void {
    this.running = false;
    logger.info("Scheduler stopping", { event: "scheduler.stopping" });
  }

  private async tick(): Promise<void> {
    const ready = await this.loadReadyJobs();
    if (ready.length === 0) return;

    const now = Date.now();
    const heap = new MinHeap<Job>(makeJobComparator(now));
    for (const job of ready) heap.push(job);

    while (!heap.isEmpty()) {
      const job = heap.pop()!;
      const reserved = await this.markInFlight(job.id);
      if (!reserved) continue;

      await this.dispatch.push(job.id);
      logger.info("Job dispatched", {
        event: "job.dispatched",
        jobId: job.id,
        priority: job.priority,
      });
    }
  }

  private async loadReadyJobs(): Promise<Job[]> {
    const candidates = await prisma.job.findMany({
      where: {
        status: "pending",
        inDlq: false,
        scheduledAt: { lte: new Date() },
      },
      include: {
        dependencies: { include: { dependsOn: { select: { status: true } } } },
      },
    });

    return candidates.filter((job) =>
      areDependenciesMet(job.dependencies.map((d) => d.dependsOn.status)),
    );
  }

  private async markInFlight(jobId: string): Promise<boolean> {
    const result = await redis.set(
      `${INFLIGHT_PREFIX}${jobId}`,
      "1",
      "EX",
      INFLIGHT_TTL_SECONDS,
      "NX",
    );
    return result === "OK";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
