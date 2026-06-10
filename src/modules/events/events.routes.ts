import { Router } from "express";
import { streamEvents } from "@/modules/events/events.controller";

const router = Router();

router.get("/", streamEvents);

export default router;
