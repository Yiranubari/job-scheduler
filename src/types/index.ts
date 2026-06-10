export type RecurringInterval =
  | "every_1_minute"
  | "every_5_minutes"
  | "every_1_hour";

export type JobPriority = 1 | 2 | 3;

export interface CreateJobInput {
  type: string;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  scheduledAt?: string;
  recurringInterval?: RecurringInterval;
  dependsOn?: string[];
}

export type JobHandler = (payload: any) => Promise<unknown>;

export interface EmailPayload {
  to: string;
  subject: string;
  body?: string;
}

export interface WebhookPayload {
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  body?: Record<string, unknown>;
}

export interface LogPayload {
  level: "info" | "warn" | "error";
  message: string;
}

export type Subscriber = (message: string) => void;
