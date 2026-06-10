import { randomUUID } from "crypto";
import { redis } from "@/lib/redis";
import { DispatchQueue } from "@/engine/dispatch";
import { Worker } from "@/engine/worker";

const dispatch = new DispatchQueue(redis);
const worker = new Worker(`worker-${randomUUID().slice(0, 8)}`, dispatch);

worker.start();

process.on("SIGINT", () => worker.stop());
process.on("SIGTERM", () => worker.stop());
