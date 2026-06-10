import { Request, Response, NextFunction } from "express";
import { dlqService } from "@/modules/dlq/dlq.service";
import { jobIdSchema } from "@/modules/jobs/jobs.schema";

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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = jobIdSchema.parse(req.params);
    const job = await dlqService.retry(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}
