import { performance } from "perf_hooks";
import { MinHeap } from "@/core/heap";
import { SkipList } from "@/core/skiplist";

interface BenchJob {
  priority: number;
  scheduledAt: number;
  createdAt: number;
}

const compare = (a: BenchJob, b: BenchJob): number => {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.scheduledAt !== b.scheduledAt) return a.scheduledAt - b.scheduledAt;
  return a.createdAt - b.createdAt;
};

function makeJobs(n: number): BenchJob[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    priority: 1 + Math.floor(Math.random() * 3),
    scheduledAt: now + Math.floor(Math.random() * 60_000),
    createdAt: now + i,
  }));
}

interface Queue<T> {
  push(v: T): void;
  pop(): T | undefined;
  isEmpty(): boolean;
}

function bench(
  name: string,
  make: () => Queue<BenchJob>,
  jobs: BenchJob[],
): Record<string, string> {
  const q = make();

  const t0 = performance.now();
  for (const j of jobs) q.push(j);
  const t1 = performance.now();

  const t2 = performance.now();
  while (!q.isEmpty()) q.pop();
  const t3 = performance.now();

  const mixed = make();
  const half = Math.floor(jobs.length / 2);
  for (let i = 0; i < half; i++) mixed.push(jobs[i]);
  const t4 = performance.now();
  for (let i = half; i < jobs.length; i++) {
    mixed.push(jobs[i]);
    if (i % 3 === 0) mixed.pop();
  }
  const t5 = performance.now();

  return {
    structure: name,
    "push all (ms)": (t1 - t0).toFixed(2),
    "pop all (ms)": (t3 - t2).toFixed(2),
    "mixed ops (ms)": (t5 - t4).toFixed(2),
  };
}

function run(): void {
  for (const n of [1_000, 10_000, 100_000]) {
    const jobs = makeJobs(n);

    bench("warmup", () => new MinHeap<BenchJob>(compare), jobs.slice(0, 1000));
    bench("warmup", () => new SkipList<BenchJob>(compare), jobs.slice(0, 1000));

    const results = [
      bench("MinHeap", () => new MinHeap<BenchJob>(compare), jobs),
      bench("SkipList", () => new SkipList<BenchJob>(compare), jobs),
    ];

    console.log(`\n=== ${n.toLocaleString()} jobs ===`);
    console.table(results);
  }
}

run();
