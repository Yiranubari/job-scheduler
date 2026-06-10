import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@/exceptions/app-exceptions";
import { logger } from "@/utils/logger";

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }

  logger.error("Unhandled error", {
    event: "http.unhandled_error",
    method: req.method,
    path: req.path,
    error: String(err),
  });
  res.status(500).json({ error: "Internal server error" });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
