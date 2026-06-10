import { redis } from "@/lib/redis";
import { DispatchQueue } from "@/engine/dispatch";
import { Scheduler } from "@/engine/scheduler";
import { Reaper } from "@/engine/reaper";

const dispatch = new DispatchQueue(redis);
const scheduler = new Scheduler(dispatch);
const reaper = new Reaper();

scheduler.start();
reaper.start();

process.on("SIGINT", () => {
  scheduler.stop();
  reaper.stop();
});
process.on("SIGTERM", () => {
  scheduler.stop();
  reaper.stop();
});
