import { describe, it, expect } from "vitest";
import { Job } from "@prisma/client";
import { effectivePriority } from "@/core/aging";
import {
  AGING_THRESHOLD_MS,
  AGING_BOOST_INTERVAL_MS,
} from "@/config/constants";

function jobCreatedAt(createdAt: Date, priority = 3): Job {
  return { createdAt, priority } as Job;
}

describe("effectivePriority", () => {
  const now = new Date("2026-06-10T12:00:00Z").getTime();

  it("returns base priority before threshold", () => {
    const job = jobCreatedAt(new Date(now - AGING_THRESHOLD_MS + 1000));
    expect(effectivePriority(job, now)).toBe(3);
  });

  it("boosts by one at threshold", () => {
    const job = jobCreatedAt(new Date(now - AGING_THRESHOLD_MS));
    expect(effectivePriority(job, now)).toBe(2);
  });

  it("boosts again after each interval", () => {
    const job = jobCreatedAt(
      new Date(now - AGING_THRESHOLD_MS - AGING_BOOST_INTERVAL_MS),
    );
    expect(effectivePriority(job, now)).toBe(1);
  });

  it("never goes above priority 1", () => {
    const job = jobCreatedAt(
      new Date(now - AGING_THRESHOLD_MS - 10 * AGING_BOOST_INTERVAL_MS),
    );
    expect(effectivePriority(job, now)).toBe(1);
  });

  it("does not boost high-priority jobs above 1", () => {
    const job = jobCreatedAt(new Date(now - AGING_THRESHOLD_MS), 1);
    expect(effectivePriority(job, now)).toBe(1);
  });
});
