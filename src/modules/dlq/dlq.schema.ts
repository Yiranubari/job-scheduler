import { z } from "zod";

export const retryDlqSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type RetryDlqDto = z.infer<typeof retryDlqSchema>;
