import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jobsRouter from "@/modules/jobs/jobs.routes";
import eventsRouter from "@/modules/events/events.routes";
import dlqRouter from "@/modules/dlq/dlq.routes";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "@/middleware/error.middleware";

const app = express();

app.set("trust proxy", 1);

app.use(cors());

app.use("/api/events", eventsRouter);

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/dlq", dlqRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
