import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import type { Job, Stats } from "./lib/api";
import { useEventStream } from "./hooks/useEventStream";

type View = "dashboard" | "jobs" | "create" | "dlq";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const refreshStats = useCallback(() => {
    api
      .getStats()
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const loadJobs = useCallback(() => {
    api
      .listJobs()
      .then((r) => setJobs(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadJobs();
    refreshStats();
  }, [loadJobs, refreshStats]);

  const onJobUpdate = useCallback(
    (job: Job) => {
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx === -1) return [job, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...job };
        return next;
      });
      refreshStats();
    },
    [refreshStats],
  );

  const { connected } = useEventStream(onJobUpdate);

  const dlqCount = stats?.dlqSize ?? jobs.filter((j) => j.inDlq).length;

  return (
    <>
      <header className="app">
        <span className="app-title">Job Scheduler</span>
        {!connected && (
          <span className="conn-warn">Stream disconnected — reconnecting…</span>
        )}
      </header>

      <div className="tabs">
        <button
          className={`tab ${view === "dashboard" ? "active" : ""}`}
          onClick={() => setView("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`tab ${view === "jobs" ? "active" : ""}`}
          onClick={() => setView("jobs")}
        >
          Jobs
        </button>
        <button
          className={`tab ${view === "create" ? "active" : ""}`}
          onClick={() => setView("create")}
        >
          Create
        </button>
        <button
          className={`tab ${view === "dlq" ? "active" : ""}`}
          onClick={() => setView("dlq")}
        >
          Dead-letter
          {dlqCount > 0 && <span className="count">{dlqCount}</span>}
        </button>
      </div>

      <main>
        {view === "dashboard" && <Dashboard stats={stats} />}
        {view === "jobs" && <Jobs jobs={jobs} />}
        {view === "create" && <CreateJob onCreated={loadJobs} />}
        {view === "dlq" && <Dlq jobs={jobs} />}
      </main>
    </>
  );
}
