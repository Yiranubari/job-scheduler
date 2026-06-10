import { describe, it, expect } from "vitest";
import { MinHeap } from "@/core/heap";

const numeric = (a: number, b: number) => a - b;

describe("MinHeap", () => {
  it("pops in ascending order", () => {
    const heap = new MinHeap<number>(numeric);
    const values = Array.from({ length: 500 }, () =>
      Math.floor(Math.random() * 10000),
    );
    for (const v of values) heap.push(v);

    const out: number[] = [];
    while (!heap.isEmpty()) out.push(heap.pop()!);

    expect(out).toEqual([...values].sort((a, b) => a - b));
  });

  it("peek returns min without removing", () => {
    const heap = new MinHeap<number>(numeric);
    heap.push(5);
    heap.push(1);
    heap.push(3);
    expect(heap.peek()).toBe(1);
    expect(heap.size).toBe(3);
  });

  it("pop on empty returns undefined", () => {
    const heap = new MinHeap<number>(numeric);
    expect(heap.pop()).toBeUndefined();
  });

  it("removeWhere removes matching items and preserves heap order", () => {
    const heap = new MinHeap<number>(numeric);
    for (const v of [7, 2, 9, 4, 6, 1]) heap.push(v);
    const removed = heap.removeWhere((v) => v % 2 === 0);

    expect(removed.sort((a, b) => a - b)).toEqual([2, 4, 6]);
    const out: number[] = [];
    while (!heap.isEmpty()) out.push(heap.pop()!);
    expect(out).toEqual([1, 7, 9]);
  });
});
