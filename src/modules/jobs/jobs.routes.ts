import { Router } from "express";
import {
  createJob,
  listJobs,
  getJob,
  cancelJob,
} from "@/modules/jobs/jobs.controller";
import { validate } from "@/middleware/validate.middleware";
import {
  createJobSchema,
  listJobsSchema,
  jobIdSchema,
} from "@/modules/jobs/jobs.schema";

const router = Router();

router.post("/", validate(createJobSchema), createJob);
router.get("/", validate(listJobsSchema, "query"), listJobs);
router.get("/:id", validate(jobIdSchema, "params"), getJob);
router.post("/:id/cancel", validate(jobIdSchema, "params"), cancelJob);

export default router;
