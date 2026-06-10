import { Router } from "express";
import { getStats } from "@/modules/dashboard/dashboard.controller";

const router = Router();

router.get("/stats", getStats);

export default router;
