import { Router } from "express";
import { listDlq, retryDlqJob } from "@/modules/dlq/dlq.controller";
import { validate } from "@/middleware/validate.middleware";
import { jobIdSchema } from "@/modules/jobs/jobs.schema";
import { retryDlqSchema } from "@/modules/dlq/dlq.schema";

const router = Router();

router.get("/", listDlq);
router.post("/:id/retry", validate(jobIdSchema, "params"), validate(retryDlqSchema), retryDlqJob);

export default router;
