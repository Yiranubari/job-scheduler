import { prisma } from "@/lib/prisma";

export class DashboardService {
  async stats(): Promise<{
    counts: Record<string, number>;
    dlqSize: number;
    total: number;
  }> {
    const [grouped, dlqSize, total] = await Promise.all([
      prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.job.count({ where: { inDlq: true } }),
      prisma.job.count(),
    ]);

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }

    return { counts, dlqSize, total };
  }
}

export const dashboardService = new DashboardService();
