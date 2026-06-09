import { Job } from "@prisma/client";

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
