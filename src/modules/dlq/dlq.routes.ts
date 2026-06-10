import { Router } from "express";
import { listDlq, retryDlqJob } from "@/modules/dlq/dlq.controller";
import { validate } from "@/middleware/validate.middleware";
import { jobIdSchema } from "@/modules/jobs/jobs.schema";

const router = Router();

router.get("/", listDlq);
router.post("/:id/retry", validate(jobIdSchema, "params"), retryDlqJob);

export default router;
