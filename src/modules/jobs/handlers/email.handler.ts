import { logger } from "@/utils/logger";
import { EmailPayload } from "@/types";
import { EMAIL_SIM_LATENCY_MIN_MS, EMAIL_SIM_LATENCY_SPREAD_MS, EMAIL_SIM_FAILURE_RATE } from "@/config/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(payload: EmailPayload): void {
  if (!payload.to || !EMAIL_REGEX.test(payload.to)) {
    throw new Error(`Invalid recipient: ${payload.to ?? "missing"}`);
  }
  if (!payload.subject || payload.subject.trim().length === 0) {
    throw new Error("Subject is required");
  }
}

function render(payload: EmailPayload): string {
  const body = payload.body ?? "(no body)";
  return `To: ${payload.to}\nSubject: ${payload.subject}\n\n${body}`;
}

async function deliver(rendered: string, to: string): Promise<string> {
  const latency = EMAIL_SIM_LATENCY_MIN_MS + Math.floor(Math.random() * EMAIL_SIM_LATENCY_SPREAD_MS);
  await new Promise((resolve) => setTimeout(resolve, latency));

  if (Math.random() < EMAIL_SIM_FAILURE_RATE) {
    throw new Error("SMTP connection reset by peer");
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logger.info("Email delivered", { event: "email.delivered", to, messageId, latency });
  return messageId;
}

export async function emailHandler(
  payload: EmailPayload,
): Promise<{ messageId: string }> {
  validate(payload);
  const rendered = render(payload);
  const messageId = await deliver(rendered, payload.to);
  return { messageId };
}
