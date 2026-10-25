import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const HEADER = 'x-request-id';
// Accept a caller's ID only if it is short and log-safe (no spaces/newlines).
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(HEADER);
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  req.headers[HEADER] = id;
  res.setHeader(HEADER, id);
  next();
}

export function requestIdOf(req: Request): string {
  return req.get(HEADER) ?? 'unknown';
}
