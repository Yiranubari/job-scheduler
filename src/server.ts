import app from "@/app";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { eventService } from "@/modules/events/events.service";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    event: "process.unhandled_rejection",
    error: String(reason),
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", {
    event: "process.uncaught_exception",
    error: String(err),
  });
  process.exit(1);
});

async function main(): Promise<void> {
  await eventService.init();

  const server = app.listen(env.PORT, () => {
    logger.info("API server listening", {
      event: "server.started",
      port: env.PORT,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("Shutdown initiated", { event: "server.shutdown", signal });

    server.close(async () => {
      try {
        await prisma.$disconnect();
        redis.disconnect();
        logger.info("Shutdown complete", { event: "server.shutdown_complete" });
        process.exit(0);
      } catch (err) {
        logger.error("Shutdown error", {
          event: "server.shutdown_error",
          error: String(err),
        });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.warn("Forced shutdown after timeout", {
        event: "server.shutdown_forced",
      });
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
