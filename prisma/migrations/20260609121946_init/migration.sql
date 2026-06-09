-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recurringInterval" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "workerId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "inDlq" BOOLEAN NOT NULL DEFAULT false,
    "dlqAlerted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDependency" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "dependsOnJobId" TEXT NOT NULL,

    CONSTRAINT "JobDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_scheduledAt_idx" ON "Job"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Job_inDlq_idx" ON "Job"("inDlq");

-- CreateIndex
CREATE INDEX "JobDependency_dependsOnJobId_idx" ON "JobDependency"("dependsOnJobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobDependency_jobId_dependsOnJobId_key" ON "JobDependency"("jobId", "dependsOnJobId");

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_dependsOnJobId_fkey" FOREIGN KEY ("dependsOnJobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
