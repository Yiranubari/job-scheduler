import { z } from "zod";
import "dotenv/config";

const schema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://"),
  DIRECT_DATABASE_URL: z.string().startsWith("postgresql://"),
  REDIS_URL: z.string().startsWith("redis://"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),
});
export const env = schema.parse(process.env);
