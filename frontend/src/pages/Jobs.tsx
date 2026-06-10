import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Job } from "../lib/api";

const STATUSES = [
  "all",
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
const PRIORITY_LABEL: Record<number, string> = {
  1: "P1 High",
  2: "P2 Medium",
  3: "P3 Low",
};

function fmt(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Jobs({ jobs }: { jobs: Job[] }) {
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Job | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, error?: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, error });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function select(id: string | null) {
    setSelectedId(id);
    setDetail(null);
  }

  const visible =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const live = selectedId ? jobs.find((j) => j.id === selectedId) : null;

  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    api
      .getJob(selectedId)
      .then((r) => {
        if (!stale) setDetail(r.data);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [selectedId, live?.status]);

  const shown =
    detail && detail.id === selectedId ? { ...detail, ...live } : null;

  async function cancel(id: string) {
    try {
      await api.cancelJob(id);
      showToast("Job cancelled");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Request failed", true);
    }
  }

  async function restart(id: string) {
    try {
      await api.restartJob(id);
      showToast("Job restarted");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Request failed", true);
    }
  }

  async function retry(id: string) {
    try {
      await api.retryDlqJob(id);
      showToast("Job requeued");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Request failed", true);
    }
  }

  return (
    <>
      <h1>Jobs</h1>
      <p className="sub">All jobs, newest first</p>

      <div className="toolbar">
        <div className="seg">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={filter === s ? "active" : ""}
              onClick={() => setFilter(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Retries</th>
              <th>Scheduled</th>
              <th>Interval</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <p className="empty">No jobs</p>
                </td>
              </tr>
            )}
            {visible.map((j) => (
              <tr key={j.id} className="clickable" onClick={() => select(j.id)}>
                <td className="mono dim">{j.id.slice(0, 6)}</td>
                <td>
                  {j.type}
                  {j.recurringInterval && (
                    <span className="faint"> · recurring</span>
                  )}
                </td>
                <td>
                  <span className={`prio ${j.priority === 1 ? "high" : ""}`}>
                    {PRIORITY_LABEL[j.priority]}
                  </span>
                </td>
                <td>
                  <span className={`badge ${j.status}`}>
                    {j.status[0].toUpperCase() + j.status.slice(1)}
                  </span>
                </td>
                <td className="mono">
                  {j.retryCount}/{j.maxRetries}
                </td>
                <td className="mono dim">{fmt(j.scheduledAt)}</td>
                <td className="mono dim">{j.recurringInterval ?? "\u2014"}</td>
                <td className="mono dim">{fmt(j.createdAt)}</td>
                <td>
                  {(j.status === "pending" || j.status === "processing") && (
                    <button
                      className="btn subtle sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancel(j.id);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`overlay ${selectedId ? "show" : ""}`}
        onClick={() => select(null)}
      />
      <div className={`drawer ${selectedId ? "show" : ""}`}>
        {shown && (
          <>
            <div className="drawer-head">
              <span className="mono dim">{shown.id}</span>
              <button className="x" onClick={() => select(null)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <dl className="kv">
                <dt>Type</dt>
                <dd>{shown.type}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge ${shown.status}`}>
                    {shown.status}
                  </span>
                </dd>
                <dt>Priority</dt>
                <dd>
                  <span
                    className={`prio ${shown.priority === 1 ? "high" : ""}`}
                  >
                    {PRIORITY_LABEL[shown.priority]}
                  </span>
                </dd>
                <dt>Retries</dt>
                <dd className="mono">
                  {shown.retryCount} / {shown.maxRetries}
                </dd>
                <dt>Worker</dt>
                <dd className="mono dim">{shown.workerId ?? "\u2014"}</dd>
                <dt>Scheduled at</dt>
                <dd className="mono dim">
                  {new Date(shown.scheduledAt).toLocaleString()}
                </dd>
                <dt>Claimed at</dt>
                <dd className="mono dim">
                  {shown.claimedAt
                    ? new Date(shown.claimedAt).toLocaleString()
                    : "\u2014"}
                </dd>
                <dt>Recurring</dt>
                <dd className="faint">{shown.recurringInterval ?? "\u2014"}</dd>
                <dt>Created</dt>
                <dd className="mono dim">
                  {new Date(shown.createdAt).toLocaleString()}
                </dd>
              </dl>

              <p className="sect">Payload</p>
              <div className="code">{JSON.stringify(shown.payload)}</div>

              <p className="sect">
                Depends on · {shown.dependencies?.length ?? 0}
              </p>
              {(shown.dependencies ?? []).length === 0 && (
                <p className="faint" style={{ fontSize: 13 }}>
                  None
                </p>
              )}
              {(shown.dependencies ?? []).map((d) => (
                <div className="dep-line" key={d.dependsOn.id}>
                  <span className="mono dim">{d.dependsOn.id.slice(0, 6)}</span>{" "}
                  {d.dependsOn.type}
                  <span className={`st ${d.dependsOn.status}`}>
                    {d.dependsOn.status}
                  </span>
                </div>
              ))}

              <p className="sect">Last error</p>
              {shown.lastError ? (
                <p className="errline">{shown.lastError}</p>
              ) : (
                <p className="faint" style={{ fontSize: 13 }}>
                  None
                </p>
              )}
            </div>
            {(shown.status === "pending" || shown.status === "processing" || shown.status === "cancelled" || shown.status === "failed") && (
              <div className="drawer-foot">
                {(shown.status === "pending" || shown.status === "processing") && (
                  <button
                    className="btn subtle sm"
                    onClick={() => cancel(shown.id)}
                  >
                    Cancel job
                  </button>
                )}
                {shown.status === "cancelled" && (
                  <button
                    className="btn sm"
                    onClick={() => restart(shown.id)}
                  >
                    Restart
                  </button>
                )}
                {shown.status === "failed" && (
                  <button
                    className="btn sm"
                    onClick={() => retry(shown.id)}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.error ? "error" : ""}`}>{toast.msg}</div>}
    </>
  );
}
