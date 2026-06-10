import { Comparator } from "@/core/heap";

const MAX_LEVEL = 16;
const P = 0.5;

class SkipNode<T> {
  forward: Array<SkipNode<T> | null>;

  constructor(
    public value: T | null,
    level: number,
  ) {
    this.forward = new Array(level).fill(null);
  }
}

export class SkipList<T> {
  private head = new SkipNode<T>(null, MAX_LEVEL);
  private level = 1;
  private count = 0;

  constructor(private readonly compare: Comparator<T>) {}

  get size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  private randomLevel(): number {
    let lvl = 1;
    while (Math.random() < P && lvl < MAX_LEVEL) lvl++;
    return lvl;
  }

  push(value: T): void {
    const update: Array<SkipNode<T>> = new Array(MAX_LEVEL).fill(this.head);
    let current = this.head;

    for (let i = this.level - 1; i >= 0; i--) {
      while (
        current.forward[i] &&
        this.compare(current.forward[i]!.value as T, value) < 0
      ) {
        current = current.forward[i]!;
      }
      update[i] = current;
    }

    const newLevel = this.randomLevel();
    if (newLevel > this.level) {
      for (let i = this.level; i < newLevel; i++) update[i] = this.head;
      this.level = newLevel;
    }

    const node = new SkipNode<T>(value, newLevel);
    for (let i = 0; i < newLevel; i++) {
      node.forward[i] = update[i].forward[i];
      update[i].forward[i] = node;
    }
    this.count++;
  }

  peek(): T | undefined {
    return this.head.forward[0]?.value ?? undefined;
  }

  pop(): T | undefined {
    const first = this.head.forward[0];
    if (!first) return undefined;

    for (let i = 0; i < this.level; i++) {
      if (this.head.forward[i] === first) {
        this.head.forward[i] = first.forward[i];
      }
    }
    while (this.level > 1 && !this.head.forward[this.level - 1]) {
      this.level--;
    }
    this.count--;
    return first.value as T;
  }

  toArray(): T[] {
    const out: T[] = [];
    let current = this.head.forward[0];
    while (current) {
      out.push(current.value as T);
      current = current.forward[0];
    }
    return out;
  }
}
