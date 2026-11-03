import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, output } from "zod";
import { errors, type ApiError } from "./errors.js";

export class HttpError extends Error {
  readonly status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "HttpError";
    this.status = error.status;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError({
      status: errors.invalidRequest.status,
      message: result.error.issues[0]?.message ?? errors.invalidRequest.message,
    });
  }
  return result.data;
}

export function isUniqueViolation(error: unknown, column: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: string; detail?: string };
  return candidate.code === "23505" && (candidate.detail ?? "").includes(`(${column})`);
}
