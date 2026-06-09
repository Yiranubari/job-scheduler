import { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function claimJob(
  jobId: string,
  workerId: string,
): Promise<Job | null> {
  const rows = await prisma.$queryRaw<Job[]>`
    UPDATE "Job"
    SET status = 'processing',
        "workerId" = ${workerId},
        "claimedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = ${jobId}
      AND status = 'pending'
    RETURNING *
  `;

  return rows[0] ?? null;
}
