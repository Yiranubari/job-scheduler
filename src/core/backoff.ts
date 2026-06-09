import { BACKOFF_BASE_MS, BACKOFF_MULTIPLIER } from "@/config/constants";

export function computeBackoff(attempt: number): number {
  const exponent = attempt - 1;
  const ceiling = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, exponent);
  const jitter = Math.random() * ceiling;
  return Math.floor(jitter);
}
