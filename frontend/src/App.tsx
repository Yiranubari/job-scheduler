import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api";
import type { Job, Stats } from "./lib/api";
import { useEventStream } from "./hooks/useEventStream";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import Dlq from "./pages/Dlq";

type View = "dashboard" | "jobs" | "create" | "dlq";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [dlqRefresh, setDlqRefresh] = useState(0);

  const refreshStats = useCallback(() => {
    api
      .getStats()
      .then((r) => {
        setStats(r.data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  const loadJobs = useCallback(() => {
    api
      .listJobs()
      .then((r) => {
        setJobs(r.data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    loadJobs();
    refreshStats();
  }, [loadJobs, refreshStats]);

  useEffect(() => {
    if (!loadError) return;
    const t = setInterval(() => {
      loadJobs();
      refreshStats();
    }, 5000);
    return () => clearInterval(t);
  }, [loadError, loadJobs, refreshStats]);

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
      setDlqRefresh((n) => n + 1);
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
          <span className="conn-warn">Stream disconnected - reconnecting…</span>
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

      {loadError && (
        <div className="toast error">
          Couldn't reach the API.{" "}
          <button
            className="btn sm"
            onClick={() => {
              loadJobs();
              refreshStats();
            }}
          >
            Retry
          </button>
        </div>
      )}

      <main>
        {view === "dashboard" && <Dashboard stats={stats} />}
        {view === "jobs" && <Jobs jobs={jobs} />}
        {view === "create" && <CreateJob onCreated={loadJobs} />}
        {view === "dlq" && <Dlq refreshSignal={dlqRefresh} />}
      </main>
    </>
  );
}
