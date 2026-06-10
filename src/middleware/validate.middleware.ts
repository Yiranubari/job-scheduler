import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

type Target = "body" | "query" | "params";

export function validate(schema: ZodType, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[target]);
    res.locals[target] = parsed;
    next();
  };
}
