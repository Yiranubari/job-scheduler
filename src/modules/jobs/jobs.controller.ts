import { Request, Response, NextFunction } from "express";
import { jobService } from "@/modules/jobs/jobs.service";
import type { CreateJobDto, ListJobsQuery } from "@/modules/jobs/jobs.schema";

export async function createJob(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = res.locals.body as CreateJobDto;
    const job = await jobService.create(input);
    res.status(201).json({ data: job });
  } catch (err) {
    next(err);
  }
}

export async function listJobs(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = res.locals.query as ListJobsQuery;
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
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.params as { id: string };
    const job = await jobService.getById(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}

export async function cancelJob(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.params as { id: string };
    const job = await jobService.cancel(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}

export async function restartJob(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = res.locals.params as { id: string };
    const job = await jobService.restart(id);
    res.status(200).json({ data: job });
  } catch (err) {
    next(err);
  }
}
