import { describe, it, expect } from "vitest";
import { SkipList } from "@/core/skiplist";

const numeric = (a: number, b: number) => a - b;

describe("SkipList", () => {
  it("pops in ascending order", () => {
    const list = new SkipList<number>(numeric);
    const values = Array.from({ length: 500 }, () =>
      Math.floor(Math.random() * 10000),
    );
    for (const v of values) list.push(v);

    const out: number[] = [];
    while (!list.isEmpty()) out.push(list.pop()!);
    expect(out).toEqual([...values].sort((a, b) => a - b));
  });

  it("peek returns min without removing", () => {
    const list = new SkipList<number>(numeric);
    list.push(5);
    list.push(1);
    list.push(3);
    expect(list.peek()).toBe(1);
    expect(list.size).toBe(3);
  });

  it("pop on empty returns undefined", () => {
    expect(new SkipList<number>(numeric).pop()).toBeUndefined();
  });
});
