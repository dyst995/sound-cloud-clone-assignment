import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { errors, sendError } from "../errors.js";
import { HttpError } from "../http.js";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    sendError(res, error);
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "entity.parse.failed"
  ) {
    sendError(res, errors.invalidJson);
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      sendError(res, errors.fileTooLarge);
      return;
    }
    sendError(res, errors.uploadUnreadable);
    return;
  }

  console.error(error);
  sendError(res, errors.unexpected);
}
