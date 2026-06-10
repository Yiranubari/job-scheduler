import { Redis } from "ioredis";
import { DISPATCH_KEY, INFLIGHT_PREFIX } from "@/config/constants";

export class DispatchQueue {
  constructor(private readonly redis: Redis) {}

  async push(jobId: string): Promise<void> {
    await this.redis.lpush(DISPATCH_KEY, jobId);
  }

  async pop(timeoutSeconds = 5): Promise<string | null> {
    const result = await this.redis.brpop(DISPATCH_KEY, timeoutSeconds);
    return result ? result[1] : null;
  }

  async ack(jobId: string): Promise<void> {
    await this.redis.del(`${INFLIGHT_PREFIX}${jobId}`);
  }

  async size(): Promise<number> {
    return this.redis.llen(DISPATCH_KEY);
  }

  async clear(): Promise<void> {
    await this.redis.del(DISPATCH_KEY);
  }
}
