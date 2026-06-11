# Job Scheduler UI

React frontend for the job scheduler. Built with Vite, TypeScript, and plain CSS. No UI libraries.

## What it does

- **Dashboard**: job counts by status, updated in real time
- **Jobs**: filterable table of all jobs, with a detail drawer showing the full payload, dependency statuses, worker info, and last error. Cancel, restart, and retry actions live here too
- **Create**: form for new jobs with priority, schedule time, recurring interval, and a dependency picker. Validation errors from the API show up on the exact field that caused them
- **Dead-letter**: failed jobs with their errors. The payload is editable, so you can fix the cause and retry in one place

All four views update live. The app holds one Server-Sent Events connection (`/api/events`), and every job change the backend publishes flows into shared state in `App.tsx`. Pages just render slices of that state, so nothing needs polling or manual refresh.

If the API becomes unreachable, the app says so, offers a retry button, and also retries on its own every 5 seconds. The header shows a warning while the event stream is down. EventSource reconnects automatically.

## Layout

```
src/
  lib/api.ts               typed API client
  hooks/useEventStream.ts  SSE subscription hook
  pages/                   Dashboard, Jobs, CreateJob, Dlq
  App.tsx                  shell, tabs, shared job state, the single SSE connection
  index.css                all styles
```

## Running

```bash
npm install
npm run dev
```

Runs on http://localhost:5173 and proxies /api to the backend on port 3000 (see `vite.config.ts`), so start the API first.

## Building

```bash
npm run build
```

Output goes to `dist/`. In production Nginx serves these files directly and proxies /api to the Node API. No server-side rendering, no environment variables needed at build time.
