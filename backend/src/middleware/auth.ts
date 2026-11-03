import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { errors, sendError } from "../errors.js";

function readToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) {
    return null;
  }
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return "";
  }
  return match[1];
}

function userIdFromToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token === null) {
    next();
    return;
  }
  if (token === "") {
    sendError(res, errors.invalidToken);
    return;
  }
  const userId = userIdFromToken(token);
  if (!userId) {
    sendError(res, errors.invalidToken);
    return;
  }
  req.userId = userId;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    sendError(res, errors.loginRequired);
    return;
  }
  next();
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: 60 * 60 * 24 * 7 });
}
