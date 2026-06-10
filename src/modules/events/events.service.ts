import { redis } from "@/lib/redis";
import { logger } from "@/utils/logger";
import { JOB_EVENTS_CHANNEL } from "@/config/constants";
import { Subscriber } from "@/types";

class EventService {
  private subscribers = new Set<Subscriber>();
  private subscriber = redis.duplicate();

  async init(): Promise<void> {
    await this.subscriber.subscribe(JOB_EVENTS_CHANNEL);
    this.subscriber.on("message", (_channel, message) => {
      for (const fn of this.subscribers) fn(message);
    });
    logger.info("SSE subscriber ready", { event: "sse.ready" });
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }
}

export const eventService = new EventService();

export async function publishJobUpdate(job: unknown): Promise<void> {
  await redis.publish(JOB_EVENTS_CHANNEL, JSON.stringify(job));
}
