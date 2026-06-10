const BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: 1 | 2 | 3;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  scheduledAt: string;
  recurringInterval: string | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  workerId: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inDlq: boolean;
  dependencies?: {
    dependsOn: { id: string; type: string; status: Job["status"] };
  }[];
}

export interface Stats {
  counts: Record<Job["status"], number>;
  dlqSize: number;
  total: number;
}

export interface CreateJobInput {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
  recurringInterval?: string;
  dependsOn?: string[];
}

class ApiError extends Error {
  details?: { path: string; message: string }[];

  constructor(message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = res.status === 503
      ? "Service temporarily unavailable - retrying"
      : body?.error ?? `Request failed (${res.status})`;
    throw new ApiError(message, body?.details);
  }
  return body;
}

export const api = {
  listJobs: (params?: { status?: string }) => {
    const qs = params?.status ? `?status=${params.status}` : "";
    return request<{ data: Job[]; meta: { total: number } }>(`/jobs${qs}`);
  },
  getJob: (id: string) => request<{ data: Job }>(`/jobs/${id}`),
  createJob: (input: CreateJobInput) =>
    request<{ data: Job }>(`/jobs`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cancelJob: (id: string) =>
    request<{ data: Job }>(`/jobs/${id}/cancel`, { method: "POST" }),
  restartJob: (id: string) =>
    request<{ data: Job }>(`/jobs/${id}/restart`, { method: "POST" }),
  listDlq: () => request<{ data: Job[] }>(`/dlq`),
  retryDlqJob: (id: string, payload?: Record<string, unknown>) =>
    request<{ data: Job }>(`/dlq/${id}/retry`, {
      method: "POST",
      body: JSON.stringify(payload ? { payload } : {}),
    }),
  getStats: () => request<{ data: Stats }>(`/dashboard/stats`),
};

export { ApiError };
