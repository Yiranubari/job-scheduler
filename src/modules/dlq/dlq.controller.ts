import { Request, Response, NextFunction } from "express";
import { dlqService } from "@/modules/dlq/dlq.service";

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
    const job = await dlqService.retry(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}
