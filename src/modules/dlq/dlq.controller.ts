import { Request, Response, NextFunction } from "express";
import { dlqService } from "@/modules/dlq/dlq.service";
import type { RetryDlqDto } from "@/modules/dlq/dlq.schema";

export async function listDlq(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobs = await dlqService.list();
    res.status(200).json({ data: jobs });
  } catch (err) {
    next(err);
  }
}

export async function retryDlqJob(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.params as { id: string };
    const { payload } = (res.locals.body ?? {}) as RetryDlqDto;
    const job = await dlqService.retry(id, payload);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}
