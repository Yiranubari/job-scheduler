import { describe, it, expect } from "vitest";
import { hasCycle, areDependenciesMet } from "@/core/dag";

describe("areDependenciesMet", () => {
  it("true when all completed", () => {
    expect(areDependenciesMet(["completed", "completed"])).toBe(true);
  });

  it("false when any not completed", () => {
    expect(areDependenciesMet(["completed", "pending"])).toBe(false);
    expect(areDependenciesMet(["failed"])).toBe(false);
  });

  it("true for no dependencies", () => {
    expect(areDependenciesMet([])).toBe(true);
  });
});

describe("hasCycle", () => {
  it("false for a chain", () => {
    expect(
      hasCycle([
        { jobId: "a", dependsOnJobId: "b" },
        { jobId: "b", dependsOnJobId: "c" },
      ]),
    ).toBe(false);
  });

  it("true for a direct cycle", () => {
    expect(
      hasCycle([
        { jobId: "a", dependsOnJobId: "b" },
        { jobId: "b", dependsOnJobId: "a" },
      ]),
    ).toBe(true);
  });

  it("true for a longer cycle", () => {
    expect(
      hasCycle([
        { jobId: "a", dependsOnJobId: "b" },
        { jobId: "b", dependsOnJobId: "c" },
        { jobId: "c", dependsOnJobId: "a" },
      ]),
    ).toBe(true);
  });

  it("false for a diamond (shared dependency, no cycle)", () => {
    expect(
      hasCycle([
        { jobId: "a", dependsOnJobId: "b" },
        { jobId: "a", dependsOnJobId: "c" },
        { jobId: "b", dependsOnJobId: "d" },
        { jobId: "c", dependsOnJobId: "d" },
      ]),
    ).toBe(false);
  });
});
