import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Job } from "../lib/api";

export default function Dlq({ refreshSignal }: { refreshSignal: number }) {
  const [dlqJobs, setDlqJobs] = useState<Job[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listDlq()
      .then((r) => setDlqJobs(r.data))
      .catch(() => setDlqJobs([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  function toggle(j: Job) {
    if (open === j.id) {
      setOpen(null);
      return;
    }
    setOpen(j.id);
    setDraft(JSON.stringify(j.payload, null, 2));
    setDraftError(null);
  }

  async function retry(j: Job) {
    let payload: Record<string, unknown> | undefined;
    if (open === j.id) {
      try {
        payload = JSON.parse(draft);
      } catch {
        setDraftError("Invalid JSON, fix it or collapse to retry unchanged");
        return;
      }
    }
    try {
      await api.retryDlqJob(j.id, payload);
      setToast("Job requeued");
      setOpen(null);
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Retry failed");
    }
    setTimeout(() => setToast(null), 3000);
  }

  if (dlqJobs === null) return <p className="empty">Loading…</p>;

  return (
    <>
      <h1>Dead-letter queue</h1>
      <p className="sub">
        Jobs that exhausted all retries. Inspect the error, fix the payload if
        needed, then retry.
      </p>

      {dlqJobs.length === 0 && (
        <p className="empty">Dead-letter queue is empty</p>
      )}

      {dlqJobs.map((j) => (
        <div className={`dlq-item ${open === j.id ? "open" : ""}`} key={j.id}>
          <div className="dlq-head" onClick={() => toggle(j)}>
            <span className="caret">▶</span>
            <span className="mono dim">{j.id.slice(0, 6)}</span>
            <span>{j.type}</span>
            <span className="dlq-meta">
              {j.retryCount} attempts · failed{" "}
              {new Date(j.updatedAt).toLocaleTimeString()}
            </span>
            <span style={{ marginLeft: "auto" }} />
            <button
              className="btn sm"
              onClick={(e) => {
                e.stopPropagation();
                retry(j);
              }}
            >
              Retry
            </button>
          </div>
          {open === j.id && (
            <div className="dlq-body">
              <p className="lbl">Last error</p>
              <p className="errline">{j.lastError ?? "Unknown"}</p>
              <p className="lbl">
                Payload, editable, retries with your changes
              </p>
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setDraftError(null);
                }}
              />
              {draftError && <p className="field-error">{draftError}</p>}
            </div>
          )}
        </div>
      ))}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
