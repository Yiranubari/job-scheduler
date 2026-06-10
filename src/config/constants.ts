export const AGING_THRESHOLD_MS = 30_000;
export const AGING_BOOST_INTERVAL_MS = 30_000;
export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MULTIPLIER = 5;
export const DISPATCH_KEY = "dispatch:queue";
export const JOB_EVENTS_CHANNEL = "job:events";
export const POLL_INTERVAL_MS = 1000;
export const RECURRING_INTERVAL_MS: Record<string, number> = {
  every_1_minute: 60_000,
  every_5_minutes: 300_000,
  every_1_hour: 3_600_000,
};
export const SCHEDULER_TICK_MS = 1000;
export const INFLIGHT_TTL_SECONDS = 30;
export const REAPER_TICK_MS = 10_000;
export const STUCK_TIMEOUT_MS = 60_000;
