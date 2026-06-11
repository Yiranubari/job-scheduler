# Architecture

Background job scheduler. Live at https://yiranubari-scheduler.duckdns.org with API docs at /api/docs.

## 1. System overview

The system runs as three separate long-running processes:

- **API server** (`src/server.ts`): Express 5 app. Handles all HTTP requests, validates input with zod, writes jobs to Postgres, and streams live updates to the UI over Server-Sent Events.
- **Scheduler** (`src/scheduler.entry.ts`): owns the in-memory priority queue. Every second it loads ready jobs from Postgres, rebuilds the heap, and pushes job IDs onto a Redis dispatch list. It also runs the reaper, which recovers jobs stuck on dead workers.
- **Worker** (`src/worker.entry.ts`): pops job IDs from the Redis list, claims the job in Postgres, runs the handler, and records the result. You can run more than one worker and they will not step on each other.

Two data stores, with a clear split between them:

- **Postgres (Neon)** is the source of truth. Every job, status change, retry count, and error lives here. If everything else dies, Postgres has the full picture.
- **Redis (local on the server)** is for coordination only: the dispatch list workers pop from, short-lived inflight keys, and pub/sub for live UI events. Everything in Redis is disposable. If Redis loses its data, the scheduler just re-dispatches from Postgres on the next tick.

The UI is a React app served as static files by Nginx, which also proxies /api to the Node API.

![System Overview Diagram](<System Overview.png>)

## 2. The priority queue

The heap is a hand-built array-based binary min-heap (`src/core/heap.ts`). No libraries.

Ordering is: priority first (1 = High beats 2 = Medium beats 3 = Low), then scheduledAt, then createdAt as the tiebreaker. So among jobs of the same priority, the one scheduled earliest runs first, and if those match too, the oldest one wins.

**Why the heap is rebuilt every tick.** The scheduler does not keep one long-lived heap in memory. Each second it queries Postgres for jobs that are ready to run (pending, scheduledAt in the past, dependencies met) and builds a fresh heap from that set. This costs O(n log n) per tick, which is cheap at realistic queue sizes (our benchmark puts 100,000 pushes at about 12ms). In return:

- The heap can never go stale. Priorities computed with aging are recomputed every second, so a job's effective priority is always current.
- A scheduler crash loses nothing. The next tick rebuilds from Postgres.
- Cancelled jobs drop out naturally because the ready query no longer returns them.

## 3. Job lifecycle and duplicate protection

Statuses: pending, processing, completed, failed, cancelled.

A job is created as pending. The scheduler dispatches its ID to Redis when it is ready. A worker pops the ID and tries to claim it with a single SQL statement:

```sql
UPDATE "Job"
SET status = 'processing', "workerId" = $1, "claimedAt" = now()
WHERE id = $2 AND status = 'pending'
RETURNING *;
```

The `WHERE status = 'pending'` is the whole duplicate-protection story. If two workers race for the same job, Postgres serializes the updates: the first one matches the row and claims it, the second one matches nothing and walks away. One statement, atomic, no locks to manage by hand. The same condition also means a job cancelled between dispatch and claim is never picked up, since its status is no longer pending.

On top of that, the scheduler sets a short-lived `inflight:<id>` key in Redis (SET NX, 30 second TTL) before dispatching, so the same job is not pushed onto the dispatch list twice while it is in flight. The key is cleared when the worker reschedules a retry; for everything else the TTL cleans it up.
![Job Lifecycle Diagram](<Job Lifecycle.png>)

## 4. Failure handling

**Retries.** A failed job retries up to 3 times. The delay uses exponential backoff with full jitter: a random wait between 0 and 1s for the first retry, 0 to 5s for the second, 0 to 25s for the third. Jitter exists so a burst of jobs failing at the same moment does not retry at the same moment and hammer whatever is broken.

**Dead-letter queue.** After the third failed attempt the job is marked failed and flagged `inDlq`. We chose a flag on the Job row rather than a separate table because the job keeps its identity, its history, and its dependency links. The DLQ view in the UI shows the last error and lets you edit the payload before retrying, since for payload-caused failures the payload is the thing you need to fix. A manual retry resets the retry count and requeues the job.

**Threshold alert.** When the DLQ size reaches 10, a warning is logged once (a `dlqAlerted` flag stops it from repeating). 10 is an arbitrary but documented choice: small enough to catch a systemic problem early, large enough that a few one-off bad payloads do not page anyone.

**The reaper.** If a worker dies mid-job, the job is stuck in processing forever. The reaper runs every 10 seconds inside the scheduler process and resets any processing job whose claimedAt is older than 60 seconds back to pending. The reclaim does not count as a retry, since the job did not fail, the worker did. 60 seconds is comfortably above our longest simulated job (5s) plus overhead.

**Database outages.** If Postgres is unreachable, the API returns 503 Service Unavailable instead of 500, because the request did not fail due to a bug, it failed because a dependency is down. The scheduler and reaper loops catch per-tick errors and just try again next tick. The frontend shows a retry toast and re-fetches automatically every 5 seconds.

## 5. Documented decisions

**Cancellation mid-processing: cancel wins.** Cancelling a pending job simply flips its status, and the claim condition guarantees no worker picks it up. The harder case is a job already running. We let the handler finish (we cannot safely kill arbitrary code halfway through a side effect), but before writing the result the worker re-reads the job status. If it became cancelled while running, the result is thrown away and the job stays cancelled. So the rule the user sees is simple: once you cancel, the job will never show as completed.

**Starvation prevention: aging.** A strict priority queue can starve low-priority jobs forever if high-priority work keeps arriving. Our fix: a job that has waited more than 30 seconds past its scheduled time gets its effective priority boosted by one level for every additional 30 seconds waited, capped at High. The thresholds are constants in `src/config/constants.ts`. 30 seconds is the documented threshold: short enough to demo, and the mechanism is what matters, not the exact number, which would be tuned to the workload in a real system.

**Simulation knobs.** The email handler simulates 2 to 5 seconds of latency and a 25% failure rate ("SMTP connection reset by peer"). Both are constants. They are deliberately exaggerated so retries, backoff, and live status changes are visible during a demo. Production values would come from the real provider.

**Restart for cancelled jobs.** Not required by the spec, added deliberately. A cancelled job can be restarted by an operator, which resets it to pending with a clean retry count. This does not break the "cancelled jobs do not get processed" rule: nothing cancelled ever runs, a human explicitly un-cancels it first.

## 6. Job dependencies (DAG)

Dependencies live in a separate `JobDependency` table (jobId, dependsOnJobId). A job is only considered ready when all of its dependencies have status completed, checked by the scheduler as part of the ready query each tick. Failed or cancelled dependencies block the dependent job, it stays pending.

Cycles are rejected at creation time. When a job is created with `dependsOn`, we run a depth-first search over the existing dependency graph plus the proposed edges. If adding the job would create a cycle, the API returns 409 and nothing is written. This keeps the invariant simple: the graph in the database is always acyclic, so the scheduler never has to worry about deadlocked dependency loops.

## 7. Alternative algorithm: skip list benchmark

The required alternative is a skip list (`src/core/skiplist.ts`), also hand-built, with the same push/pop/peek interface as the heap. A skip list is a sorted linked list with probabilistic express lanes: every node gets level 1, half get level 2, a quarter level 3, and so on. Search and insert walk the top lane as far as possible, then drop down. This gives O(log n) expected operations with no rebalancing logic. Redis sorted sets use the same structure internally.

Benchmark (`npm run bench`), with warmup runs discarded before measuring:

| 1,000 jobs | push all | pop all | mixed ops |
| ---------- | -------- | ------- | --------- |
| MinHeap    | 1.09 ms  | 0.74 ms | 0.30 ms   |
| SkipList   | 1.08 ms  | 0.46 ms | 0.64 ms   |

| 10,000 jobs | push all | pop all  | mixed ops |
| ----------- | -------- | -------- | --------- |
| MinHeap     | 5.64 ms  | 16.24 ms | 2.90 ms   |
| SkipList    | 23.87 ms | 3.58 ms  | 7.17 ms   |

| 100,000 jobs | push all  | pop all   | mixed ops |
| ------------ | --------- | --------- | --------- |
| MinHeap      | 11.61 ms  | 175.48 ms | 22.51 ms  |
| SkipList     | 316.03 ms | 24.65 ms  | 222.35 ms |

What the numbers say:

- The heap wins inserts by a wide margin at scale (27x at 100k). Heap inserts touch a contiguous array, which is cache-friendly. Skip list inserts allocate a node and splice pointers across several levels, and at 100k elements those pointer chases miss cache constantly.
- The skip list wins drains (7x at 100k). Its list is always fully sorted, so popping the minimum is just unlinking the head. A heap pop pays a sift-down through about 17 levels each time.
- On the mixed workload, which is closest to what the scheduler actually does each tick (interleaved pushes and pops), the heap leads by about 10x at 100k.
- At 1,000 jobs the two are basically tied. At realistic queue depths either structure works, the gap is an at-scale property.

Conclusion: the scheduler keeps the heap. Its workload is rebuild-and-interleave, which is exactly where the heap wins. The skip list would earn its place if we needed ordered iteration or cheap removal of arbitrary elements (for example, very frequent mid-queue cancellation), which it supports natively and a heap does not.

## 8. Deployment

Manually deployed to an AWS EC2 t3.micro (Ubuntu, Frankfurt region, same region as the Neon database, which keeps query latency in single-digit milliseconds).

- **Nginx** serves the built React app as static files and reverse-proxies /api to the Node API on localhost:3000. The /api/events route has `proxy_buffering off` so Server-Sent Events stream through instead of being buffered.
- **HTTPS** via Let's Encrypt (certbot), with automatic renewal. HTTP redirects to HTTPS.
- **Two domains** point at the server: yiranubari-scheduler.duckdns.org (primary) and yiranubari-scheduler.dedyn.io (fallback, since DuckDNS had outages the week of submission). One certificate covers both.
- **PM2** runs the three Node processes, restarts them if they crash, and is registered with systemd so everything comes back on its own after a server reboot. This was tested: reboot the box, all three processes return online without any manual step.
- **Redis** runs locally on the server, bound to localhost, so it is not reachable from the internet.
- **Graceful shutdown**: each process traps SIGTERM, stops taking new work, finishes what it is doing (PM2 gives it 12 seconds), and exits. A worker killed mid-job is covered by the reaper either way.

The production configs (PM2 ecosystem file and the Nginx site) are committed in `deploy/`.

## Architecture diagrams

[View on Figma](https://www.figma.com/design/kH11EyHldIx13u3NUJg3Oz)
