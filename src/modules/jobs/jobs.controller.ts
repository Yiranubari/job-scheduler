import { Request, Response, NextFunction } from "express";
import { jobService } from "@/modules/jobs/jobs.service";
import {
  createJobSchema,
  listJobsSchema,
  jobIdSchema,
} from "@/modules/jobs/jobs.schema";

export async function createJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createJobSchema.parse(req.body);
    const job = await jobService.create(input);
    res.status(201).json({ data: job });
  } catch (err) {
    next(err);
  }
}

export async function listJobs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listJobsSchema.parse(req.query);
    const result = await jobService.list(query);
    res
      .status(200)
      .json({
        data: result.jobs,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
  } catch (err) {
    next(err);
  }
}

export async function getJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = jobIdSchema.parse(req.params);
    const job = await jobService.getById(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}

export async function cancelJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = jobIdSchema.parse(req.params);
    const job = await jobService.cancel(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}
