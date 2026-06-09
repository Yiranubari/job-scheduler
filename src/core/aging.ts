import { Job } from "@prisma/client";
import {
  AGING_THRESHOLD_MS,
  AGING_BOOST_INTERVAL_MS,
} from "@/config/constants";

export function effectivePriority(job: Job, now: number = Date.now()): number {
  const waited = now - job.createdAt.getTime();

  if (waited < AGING_THRESHOLD_MS) {
    return job.priority;
  }

  const boosts =
    Math.floor((waited - AGING_THRESHOLD_MS) / AGING_BOOST_INTERVAL_MS) + 1;
  const boosted = job.priority - boosts;

  return Math.max(1, boosted);
}
