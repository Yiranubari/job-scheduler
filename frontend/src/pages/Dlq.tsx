import { useRef, useState } from "react";
import { api } from "../lib/api";
import type { Job } from "../lib/api";

export default function Dlq({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dlq = jobs.filter((j) => j.inDlq);

  function showToast(msg: string, error?: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, error });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

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
        setDraftError("Invalid JSON - fix it or collapse to retry unchanged");
        return;
      }
    }
    try {
      await api.retryDlqJob(j.id, payload);
      showToast("Job requeued");
      setOpen(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Retry failed", true);
    }
  }

  return (
    <>
      <h1>Dead-letter queue</h1>
      <p className="sub">Jobs that exhausted all retries. Inspect the error, fix the payload if needed, then retry.</p>

      {dlq.length === 0 && <p className="empty">Dead-letter queue is empty</p>}

      {dlq.map((j) => (
        <div className={`dlq-item ${open === j.id ? "open" : ""}`} key={j.id}>
          <div className="dlq-head" onClick={() => toggle(j)}>
            <span className="caret">▶</span>
            <span className="mono dim">{j.id.slice(0, 6)}</span>
            <span>{j.type}</span>
            <span className="dlq-meta">
              {j.retryCount} attempts · failed {new Date(j.updatedAt).toLocaleTimeString()}
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
              <p className="lbl">Payload - editable, retries with your changes</p>
              <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setDraftError(null); }} />
              {draftError && <p className="field-error">{draftError}</p>}
            </div>
          )}
        </div>
      ))}

      {toast && <div className={`toast ${toast.error ? "error" : ""}`}>{toast.msg}</div>}
    </>
  );
}
