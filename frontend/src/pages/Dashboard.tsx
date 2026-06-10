import type { Stats } from "../lib/api";

export default function Dashboard({ stats }: { stats: Stats | null }) {
  if (!stats) return <p className="empty">Loading…</p>;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="sub">Job counts by status, updated in real time</p>
      <div className="stats">
        <div className="stat">
          <div className="k">Pending</div>
          <div className="v">{stats.counts.pending}</div>
        </div>
        <div className="stat">
          <div className="k">Processing</div>
          <div className="v blue">{stats.counts.processing}</div>
        </div>
        <div className="stat">
          <div className="k">Completed</div>
          <div className="v green">{stats.counts.completed}</div>
        </div>
        <div className="stat">
          <div className="k">Failed</div>
          <div className="v red">{stats.counts.failed}</div>
        </div>
        <div className="stat">
          <div className="k">Cancelled</div>
          <div className="v">{stats.counts.cancelled}</div>
        </div>
        <div className={`stat ${stats.dlqSize > 0 ? "alert" : ""}`}>
          <div className="k">Dead-letter</div>
          <div className="v">{stats.dlqSize}</div>
        </div>
      </div>
    </>
  );
}
