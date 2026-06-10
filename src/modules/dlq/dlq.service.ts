import { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { publishJobUpdate } from "@/modules/events/events.service";
import { NotFoundError, ConflictError } from "@/exceptions/app-exceptions";
import { DLQ_ALERT_THRESHOLD } from "@/config/constants";

export class DlqService {
  async list(): Promise<Job[]> {
    return prisma.job.findMany({
      where: { inDlq: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async retry(id: string): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundError(`Job ${id} not found`);
    if (!job.inDlq)
      throw new ConflictError("Job is not in the dead-letter queue");

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: "pending",
        inDlq: false,
        retryCount: 0,
        lastError: null,
        scheduledAt: new Date(),
        workerId: null,
        claimedAt: null,
      },
    });

    logger.info("DLQ manual retry", { event: "job.dlq_retried", jobId: id });
    await publishJobUpdate(updated);
    return updated;
  }

  async checkThreshold(): Promise<void> {
    const count = await prisma.job.count({
      where: { inDlq: true, dlqAlerted: false },
    });
    if (count < DLQ_ALERT_THRESHOLD) return;

    await this.sendAlert(count);
    await prisma.job.updateMany({
      where: { inDlq: true, dlqAlerted: false },
      data: { dlqAlerted: true },
    });
  }

  private async sendAlert(count: number): Promise<void> {
    logger.warn("DLQ threshold exceeded, alert email sent", {
      event: "dlq.alert_sent",
      count,
      threshold: DLQ_ALERT_THRESHOLD,
      to: "yiranubari@gmail.test",
    });
  }
}

export const dlqService = new DlqService();
