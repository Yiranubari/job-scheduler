import { z } from "zod";

export const createJobSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  scheduledAt: z.coerce.date().optional(),
  recurringInterval: z
    .enum(["every_1_minute", "every_5_minutes", "every_1_hour"])
    .optional(),
  dependsOn: z.array(z.string().uuid()).max(20).optional(),
});

export const listJobsSchema = z.object({
  status: z
    .enum(["pending", "processing", "completed", "failed", "cancelled"])
    .optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const jobIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsSchema>;
