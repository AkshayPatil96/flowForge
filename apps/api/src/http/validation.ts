import type { z } from 'zod';
import { ApiError } from './api-error.js';

/**
 * Validates untrusted input (body, params, query) and returns the parsed value.
 * `root` prefixes error paths for single values, e.g. a path parameter name.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  value: unknown,
  root?: string,
): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ApiError(
    400,
    'VALIDATION_FAILED',
    'Request validation failed.',
    result.error.issues.map((issue) => ({
      path: [root, ...issue.path].filter((p) => p !== undefined).join('.'),
      message: issue.message,
    })),
  );
}
