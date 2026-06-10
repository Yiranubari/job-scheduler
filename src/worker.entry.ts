import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { DispatchQueue } from "@/engine/dispatch";
import { Worker } from "@/engine/worker";

const dispatch = new DispatchQueue(redis);
const worker = new Worker(`worker-${randomUUID().slice(0, 8)}`, dispatch);

worker.start();

const shutdown = async (): Promise<void> => {
  worker.stop();
  await new Promise((r) => setTimeout(r, 2000));
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
