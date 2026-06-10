import { describe, it, expect } from "vitest";
import { Job } from "@prisma/client";
import { jobComparator } from "@/core/comparator";

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: "x",
    type: "send_email",
    payload: {},
    priority: 2,
    status: "pending",
    scheduledAt: new Date("2026-06-10T10:00:00Z"),
    recurringInterval: null,
    retryCount: 0,
    maxRetries: 3,
    lastError: null,
    workerId: null,
    claimedAt: null,
    nextRunAt: null,
    inDlq: false,
    dlqAlerted: false,
    createdAt: new Date("2026-06-10T09:00:00Z"),
    updatedAt: new Date("2026-06-10T09:00:00Z"),
    ...overrides,
  } as Job;
}

describe("jobComparator", () => {
  it("orders by priority first", () => {
    const high = makeJob({
      priority: 1,
      scheduledAt: new Date("2026-06-10T12:00:00Z"),
    });
    const low = makeJob({
      priority: 3,
      scheduledAt: new Date("2026-06-10T08:00:00Z"),
    });
    expect(jobComparator(high, low)).toBeLessThan(0);
  });

  it("breaks priority ties by scheduledAt", () => {
    const earlier = makeJob({ scheduledAt: new Date("2026-06-10T08:00:00Z") });
    const later = makeJob({ scheduledAt: new Date("2026-06-10T09:00:00Z") });
    expect(jobComparator(earlier, later)).toBeLessThan(0);
  });

  it("breaks remaining ties by createdAt", () => {
    const first = makeJob({ createdAt: new Date("2026-06-10T07:00:00Z") });
    const second = makeJob({ createdAt: new Date("2026-06-10T07:30:00Z") });
    expect(jobComparator(first, second)).toBeLessThan(0);
  });

  it("returns zero for identical ordering keys", () => {
    expect(jobComparator(makeJob({}), makeJob({}))).toBe(0);
  });
});
