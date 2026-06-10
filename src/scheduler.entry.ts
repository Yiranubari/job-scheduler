import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { DispatchQueue } from "@/engine/dispatch";
import { Scheduler } from "@/engine/scheduler";
import { Reaper } from "@/engine/reaper";

const dispatch = new DispatchQueue(redis);
const scheduler = new Scheduler(dispatch);
const reaper = new Reaper();

scheduler.start();
reaper.start();

const shutdown = async (): Promise<void> => {
  scheduler.stop();
  reaper.stop();
  await new Promise((r) => setTimeout(r, 2000));
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
