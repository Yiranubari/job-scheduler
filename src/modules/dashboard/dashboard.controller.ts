import { Request, Response, NextFunction } from "express";
import { dashboardService } from "@/modules/dashboard/dashboard.service";

export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await dashboardService.stats();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}
