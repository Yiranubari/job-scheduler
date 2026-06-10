import { useState } from "react";
import { api, ApiError } from "../lib/api";
import type { Job } from "../lib/api";

const INTERVALS = ["", "every_1_minute", "every_5_minutes", "every_1_hour"];

export default function CreateJob({ onCreated }: { onCreated: () => void }) {
  const [type] = useState("send_email");
  const [priority, setPriority] = useState("2");
  const [payload, setPayload] = useState(
    '{"to": "a@b.com", "subject": "Welcome"}',
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [interval, setInterval_] = useState("");
  const [deps, setDeps] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Job[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function doSearch(q: string) {
    setSearch(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const r = await api.listJobs().catch(() => null);
    if (!r) return;
    setResults(
      r.data
        .filter((j) => !deps.some((d) => d.id === j.id))
        .filter((j) => j.id.includes(q) || j.type.includes(q))
        .slice(0, 5),
    );
  }

  async function submit() {
    setErrors({});
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setErrors({ payload: "Invalid JSON" });
      return;
    }

    setBusy(true);
    try {
      await api.createJob({
        type,
        payload: parsed,
        priority: Number(priority),
        scheduledAt: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
        recurringInterval: interval || undefined,
        dependsOn: deps.length ? deps.map((d) => d.id) : undefined,
      });
      setToast({ msg: "Job created" });
      setPayload('{"to": "a@b.com", "subject": "Welcome"}');
      setScheduledAt("");
      setInterval_("");
      setDeps([]);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const map: Record<string, string> = {};
        for (const d of err.details) map[d.path] = d.message;
        setErrors(map);
      } else {
        setToast({
          msg: err instanceof Error ? err.message : "Request failed",
          error: true,
        });
      }
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <>
      <h1>Create job</h1>
      <p className="sub">Queue a new background job</p>

      <form
        className="job-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="row2">
          <div className="field">
            <label>Type</label>
            <select value={type} disabled>
              <option value="send_email">send_email</option>
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="1">1 — High</option>
              <option value="2">2 — Medium</option>
              <option value="3">3 — Low</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>
            Payload <span className="opt">JSON</span>
          </label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
          {errors.payload && <p className="field-error">{errors.payload}</p>}
          <p className="help">
            Validated before submit. The handler checks required fields.
          </p>
        </div>

        <div className="row2">
          <div className="field">
            <label>
              Scheduled at <span className="opt">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            {errors.scheduledAt && (
              <p className="field-error">{errors.scheduledAt}</p>
            )}
            <p className="help">Leave empty to run immediately</p>
          </div>
          <div className="field">
            <label>
              Recurring <span className="opt">(optional)</span>
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval_(e.target.value)}
            >
              {INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i || "None"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>
            Depends on <span className="opt">(optional)</span>
          </label>
          <div className="depbox">
            {deps.map((d) => (
              <span className="chip" key={d.id}>
                {d.id.slice(0, 6)} · {d.type}
                <button
                  type="button"
                  onClick={() => setDeps(deps.filter((x) => x.id !== d.id))}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              placeholder="Search jobs…"
              value={search}
              onChange={(e) => doSearch(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div className="dep-results">
              {results.map((j) => (
                <button
                  type="button"
                  key={j.id}
                  onClick={() => {
                    setDeps([...deps, j]);
                    setSearch("");
                    setResults([]);
                  }}
                >
                  <span className="mono dim">{j.id.slice(0, 6)}</span> {j.type}
                  <span
                    className={`badge ${j.status}`}
                    style={{ marginLeft: "auto" }}
                  >
                    {j.status}
                  </span>
                </button>
              ))}
            </div>
          )}
          {errors.dependsOn && (
            <p className="field-error">{errors.dependsOn}</p>
          )}
          <p className="help">
            Runs only after all dependencies complete. Cycles are rejected.
          </p>
        </div>

        <button className="btn primary" disabled={busy}>
          {busy ? "Creating…" : "Create job"}
        </button>
      </form>

      {toast && (
        <div className={`toast ${toast.error ? "error" : ""}`}>{toast.msg}</div>
      )}
    </>
  );
}
