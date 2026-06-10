import { Job } from "@prisma/client";
import { Comparator } from "@/core/heap";
import { effectivePriority } from "@/core/aging";

export function jobComparator(a: Job, b: Job): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  const aTime = a.scheduledAt.getTime();
  const bTime = b.scheduledAt.getTime();
  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function makeJobComparator(now: number = Date.now()): Comparator<Job> {
  return (a, b) => {
    const pa = effectivePriority(a, now);
    const pb = effectivePriority(b, now);
    if (pa !== pb) return pa - pb;

    const at = a.scheduledAt.getTime();
    const bt = b.scheduledAt.getTime();
    if (at !== bt) return at - bt;

    return a.createdAt.getTime() - b.createdAt.getTime();
  };
}
