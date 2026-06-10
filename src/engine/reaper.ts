import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { publishJobUpdate } from "@/modules/events/events.service";
import { REAPER_TICK_MS, STUCK_TIMEOUT_MS } from "@/config/constants";

export class Reaper {
  private running = false;

  constructor() {}

  async start(): Promise<void> {
    this.running = true;
    logger.info("Reaper started", { event: "reaper.started" });
    while (this.running) {
      try {
        await this.tick();
      } catch (err) {
        logger.error("Reaper tick error", {
          event: "reaper.error",
          code: (err as { code?: string }).code,
          error: String(err),
        });
      }
      await this.sleep(REAPER_TICK_MS);
    }
  }

  stop(): void {
    this.running = false;
    logger.info("Reaper stopping", { event: "reaper.stopping" });
  }

  private async tick(): Promise<void> {
    const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MS);

    const stuck = await prisma.job.findMany({
      where: { status: "processing", claimedAt: { lt: cutoff } },
    });

    for (const job of stuck) {
      const updated = await prisma.job.update({
        where: { id: job.id },
        data: { status: "pending", workerId: null, claimedAt: null },
      });
      logger.warn("Reclaimed stuck job", {
        event: "job.reclaimed",
        jobId: job.id,
        claimedAt: job.claimedAt,
      });
      await publishJobUpdate(updated);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
