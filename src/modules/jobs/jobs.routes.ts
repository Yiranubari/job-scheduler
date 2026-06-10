import { Router } from "express";
import {
  createJob,
  listJobs,
  getJob,
  cancelJob,
} from "@/modules/jobs/jobs.controller";

const router = Router();

router.post("/", createJob);
router.get("/", listJobs);
router.get("/:id", getJob);
router.post("/:id/cancel", cancelJob);

export default router;
