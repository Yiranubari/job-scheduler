import { describe, it, expect } from "vitest";
import { computeBackoff } from "@/core/backoff";
import { BACKOFF_BASE_MS, BACKOFF_MULTIPLIER } from "@/config/constants";

describe("computeBackoff", () => {
  it("stays within [0, ceiling) for each attempt", () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ceiling =
        BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
      for (let i = 0; i < 200; i++) {
        const delay = computeBackoff(attempt);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(ceiling);
      }
    }
  });

  it("ceiling grows 1s, 5s, 25s", () => {
    expect(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, 0)).toBe(1000);
    expect(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, 1)).toBe(5000);
    expect(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, 2)).toBe(25000);
  });

  it("produces varying values (jitter present)", () => {
    const samples = new Set(
      Array.from({ length: 50 }, () => computeBackoff(3)),
    );
    expect(samples.size).toBeGreaterThan(1);
  });
});
