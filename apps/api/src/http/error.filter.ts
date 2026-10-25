import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../domain/domain-error.js';
import { ApiError, type ErrorDetail } from './api-error.js';
import { requestIdOf } from './request-id.js';

export interface ErrorBody {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  INVALID_STATE_TRANSITION: 409,
  WORKFLOW_NAME_TAKEN: 409,
};

// e.g. 413 -> PAYLOAD_TOO_LARGE
const codeFor = (status: number) =>
  (STATUS_CODES[status] ?? 'Error').toUpperCase().replace(/[^A-Z]+/g, '_');

/** Maps any thrown value to a status and a client-safe body. Never leaks 5xx details. */
export function toErrorResponse(exception: unknown): { status: number; body: ErrorBody } {
  if (exception instanceof ApiError) {
    const { status, code, message, details } = exception;
    return { status, body: details ? { code, message, details } : { code, message } };
  }
  if (exception instanceof DomainError) {
    const status = DOMAIN_ERROR_STATUS[exception.code] ?? 422;
    return { status, body: { code: exception.code, message: exception.message } };
  }
  // Nest's own errors (e.g. unmatched route) and Express body-parser errors
  // (e.g. 413, malformed JSON) both carry an HTTP status.
  const status =
    exception instanceof HttpException ? exception.getStatus() : httpErrorStatus(exception);
  if (status !== undefined && status >= 400 && status < 500) {
    const message = exception instanceof Error ? exception.message : codeFor(status);
    return { status, body: { code: codeFor(status), message } };
  }
  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  };
}

function httpErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { status, expose } = exception as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && expose === true ? status : undefined;
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = requestIdOf(req);
    const { status, body } = toErrorResponse(exception);

    const context = {
      requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status,
      code: body.code,
    };
    // Client mistakes are expected traffic; only server faults are errors.
    if (status >= 500) {
      this.logger.error({
        ...context,
        error: exception instanceof Error ? exception.stack : String(exception),
      });
    } else {
      this.logger.warn(context);
    }

    res.status(status).json({ error: body, requestId });
  }
}
