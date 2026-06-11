# Job Scheduler

A background job scheduler built from scratch. Jobs go into a priority queue, independent workers pick them up and run them, failures retry with backoff, and everything updates live in the browser.

**Live:** https://yiranubari-scheduler.duckdns.org
**API docs (Swagger):** https://yiranubari-scheduler.duckdns.org/api/docs
**Architecture:** [src/docs/ARCHITECTURE.md](https://github.com/Yiranubari/job-scheduler/blob/main/src/docs/ARCHITECTURE.md)

## What it does

- Create jobs with a type, JSON payload, priority (High, Medium, Low), and an optional schedule time
- Hand-built binary min-heap priority queue, ordered by priority, then scheduled time, then creation time
- Independent worker processes claim jobs atomically, so two workers can never run the same job
- Failed jobs retry up to 3 times with exponential backoff and jitter (about 1s, 5s, 25s)
- Jobs that exhaust their retries land in a dead-letter queue, where you can inspect the error, edit the payload, and retry manually
- Job dependencies (DAG): a job runs only after all the jobs it depends on have completed. Cycles are rejected at creation
- Recurring jobs that respawn on an interval
- Cancellation at any point before completion, including mid-processing
- Aging: jobs that wait too long get a priority boost so low-priority work is never starved
- Live dashboard, jobs table, create form, and DLQ view, all updating in real time over Server-Sent Events
- A skip list implementation benchmarked against the heap (`npm run bench`), with the numbers and analysis in the [architecture doc](https://github.com/Yiranubari/job-scheduler/blob/main/src/docs/ARCHITECTURE.md)

## Stack

Node.js, TypeScript, Express 5, Prisma 7, Postgres (Neon), Redis, React (Vite), Nginx, PM2. Validation with zod, logging with winston, tests with vitest.

## Project layout

```
src/
  core/        heap, skip list, comparator, aging, backoff, DAG helpers
  engine/      scheduler, worker, reaper
  modules/     jobs, dlq, dashboard, events (routes, controllers, services, schemas)
  middleware/  validation, error handling
  config/      env, constants
  docs/        OpenAPI spec
frontend/      React app
bench/         heap vs skip list benchmark
tests/         unit tests
deploy/        PM2 ecosystem file and Nginx config used in production
docs/          [architecture document](https://github.com/Yiranubari/job-scheduler/blob/main/src/docs/ARCHITECTURE.md)
```

## Running locally

You need Node 22+, a Postgres database, and Redis running locally.

1. Clone and install:

```bash
git clone https://github.com/Yiranubari/job-scheduler.git
cd job-scheduler
npm install
cd frontend && npm install && cd ..
```

2. Create a `.env` file in the root (see `.env.example`):

```
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
PORT=3000
```

3. Set up the database:

```bash
npx prisma migrate dev
```

4. Start the three processes in separate terminals:

```bash
npm run dev:api
npm run dev:scheduler
npm run dev:worker
```

5. Start the frontend:

```bash
cd frontend && npm run dev
```

Open http://localhost:5173. The Vite dev server proxies /api to the API on port 3000.

## Configuration

Key constants live in `src/config/constants.ts`:

| Constant               | Default | What it does                                                |
| ---------------------- | ------- | ----------------------------------------------------------- |
| MAX retries (per job)  | 3       | Attempts before a job moves to the DLQ                      |
| DLQ_ALERT_THRESHOLD    | 10      | Logs a warning when the DLQ reaches this size               |
| AGING_THRESHOLD_MS     | 30000   | Jobs waiting this long get a priority boost                 |
| SCHEDULER_TICK_MS      | 1000    | How often the scheduler rebuilds the queue                  |
| STUCK_TIMEOUT_MS       | 60000   | Processing jobs older than this are reclaimed by the reaper |
| EMAIL_SIM_FAILURE_RATE | 0.25    | Simulated email failure rate, exaggerated for demos         |

## Quick example

Create a job:

```bash
curl -X POST https://yiranubari-scheduler.duckdns.org/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "send_email", "payload": {"to": "a@b.com", "subject": "Hello"}, "priority": 1}'
```

Test the DAG: create job A scheduled in the future, then job B depending on it. B stays pending until A completes.

```bash
curl -X POST .../api/jobs -d '{"type": "send_email", "payload": {...}, "scheduledAt": "<1 min from now>"}'
curl -X POST .../api/jobs -d '{"type": "send_email", "payload": {...}, "dependsOn": ["<job A id>"]}'
```

## Tests and benchmark

```bash
npm test
npm run bench
```

## API

Full interactive docs at `/api/docs`. The short version:

| Method | Path                  | What it does                                                 |
| ------ | --------------------- | ------------------------------------------------------------ |
| POST   | /api/jobs             | Create a job                                                 |
| GET    | /api/jobs             | List jobs (filter by status, paginated)                      |
| GET    | /api/jobs/:id         | Get a job with its dependencies                              |
| POST   | /api/jobs/:id/cancel  | Cancel a pending or processing job                           |
| POST   | /api/jobs/:id/restart | Restart a cancelled job                                      |
| GET    | /api/dlq              | List dead-letter jobs                                        |
| POST   | /api/dlq/:id/retry    | Retry a dead-letter job, optionally with a corrected payload |
| GET    | /api/dashboard/stats  | Job counts by status                                         |
| GET    | /api/events           | Server-Sent Events stream of live job updates                |
| GET    | /health               | Health check                                                 |

## Deployment

Deployed manually to an AWS EC2 instance with Nginx as a reverse proxy, HTTPS via Let's Encrypt, and PM2 keeping the three processes alive across crashes and reboots. The exact configs are in `deploy/`, and the full story is in the [architecture doc](https://github.com/Yiranubari/job-scheduler/blob/main/src/docs/ARCHITECTURE.md).
