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

  if (isDbUnavailable(err)) {
    logger.error("Database unavailable", { event: "http.db_unavailable", method: req.method, path: req.path, error: String(err) });
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  logger.error("Unhandled error", {
    event: "http.unhandled_error",
    method: req.method,
    path: req.path,
    code: (err as { code?: string }).code,
    error: String(err),
  });
  res.status(500).json({ error: "Internal server error" });
}

function isDbUnavailable(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  if (code && ["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET"].includes(code)) return true;
  return err instanceof Error && /connection (terminated|timeout)/i.test(err.message);
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
