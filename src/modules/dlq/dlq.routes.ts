import { Router } from "express";
import { listDlq, retryDlqJob } from "@/modules/dlq/dlq.controller";

const router = Router();

router.get("/", listDlq);
router.post("/:id/retry", retryDlqJob);

export default router;
