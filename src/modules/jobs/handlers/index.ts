import { JobHandler } from "@/types";
import { emailHandler } from "@/modules/jobs/handlers/email.handler";

const handlers: Record<string, JobHandler> = {
  send_email: emailHandler,
};

export function getHandler(type: string): JobHandler {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No handler registered for job type: ${type}`);
  }
  return handler;
}

export function isKnownType(type: string): boolean {
  return type in handlers;
}
