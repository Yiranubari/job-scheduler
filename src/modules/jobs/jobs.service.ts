import { Job, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { hasCycle, DependencyEdge } from "@/core/dag";
import { isKnownType } from "@/modules/jobs/handlers";
import { publishJobUpdate } from "@/modules/events/events.service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/exceptions/app-exceptions";
import { CreateJobDto, ListJobsQuery } from "@/modules/jobs/jobs.schema";

export class JobService {
  async create(input: CreateJobDto): Promise<Job> {
    if (!isKnownType(input.type)) {
      throw new ValidationError(`Unknown job type: ${input.type}`);
    }

    if (input.dependsOn?.length) {
      await this.assertValidDependencies(input.dependsOn);
    }

    const job = await prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
        priority: input.priority,
        scheduledAt: input.scheduledAt ?? new Date(),
        recurringInterval: input.recurringInterval,
        dependencies: input.dependsOn?.length
          ? {
              create: input.dependsOn.map((dependsOnJobId) => ({
                dependsOnJobId,
              })),
            }
          : undefined,
      },
    });

    logger.info("Job created", {
      event: "job.created",
      jobId: job.id,
      type: job.type,
      priority: job.priority,
    });
    await publishJobUpdate(job);
    return job;
  }

  async list(
    query: ListJobsQuery,
  ): Promise<{ jobs: Job[]; total: number; page: number; limit: number }> {
    const where: Prisma.JobWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, total, page: query.page, limit: query.limit };
  }

  async getById(id: string): Promise<Job> {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        dependencies: {
          include: {
            dependsOn: { select: { id: true, type: true, status: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundError(`Job ${id} not found`);
    return job;
  }

  async cancel(id: string): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundError(`Job ${id} not found`);

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      throw new ConflictError(`Job is already ${job.status}`);
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status: "cancelled" },
    });

    logger.info("Job cancelled", {
      event: "job.cancelled",
      jobId: id,
      previousStatus: job.status,
    });
    await publishJobUpdate(updated);
    return updated;
  }

  private async assertValidDependencies(dependsOn: string[]): Promise<void> {
    const found = await prisma.job.findMany({
      where: { id: { in: dependsOn } },
      select: { id: true },
    });
    if (found.length !== dependsOn.length) {
      const foundIds = new Set(found.map((j) => j.id));
      const missing = dependsOn.filter((id) => !foundIds.has(id));
      throw new ValidationError(
        `Dependencies not found: ${missing.join(", ")}`,
      );
    }

    const existingEdges = await prisma.jobDependency.findMany({
      select: { jobId: true, dependsOnJobId: true },
    });
    const newJobMarker = "__new__";
    const proposed: DependencyEdge[] = [
      ...existingEdges,
      ...dependsOn.map((dependsOnJobId) => ({
        jobId: newJobMarker,
        dependsOnJobId,
      })),
    ];
    if (hasCycle(proposed)) {
      throw new ConflictError("Dependency would create a cycle");
    }
  }
}

export const jobService = new JobService();
