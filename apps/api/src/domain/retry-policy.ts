import { z } from 'zod';

// Bounds keep retries finite and prevent tight retry loops.
export const retryPolicySchema = z
  .strictObject({
    maxAttempts: z.int().min(1).max(20).default(3),
    initialDelayMs: z.int().min(100).max(3_600_000).default(1_000),
    maxDelayMs: z.int().min(100).max(3_600_000).default(60_000),
    backoffMultiplier: z.number().min(1).max(10).default(2),
    jitter: z.boolean().default(true),
  })
  .refine((p) => p.maxDelayMs >= p.initialDelayMs, {
    message: 'maxDelayMs must be >= initialDelayMs',
    path: ['maxDelayMs'],
  });

export type RetryPolicy = z.output<typeof retryPolicySchema>;

export const DEFAULT_RETRY_POLICY: RetryPolicy = retryPolicySchema.parse({});

/**
 * Delay before the next attempt after `failedAttempt` (1-based) failed.
 * Exponential backoff capped at maxDelayMs. Jitter is "equal jitter": a random
 * value in [delay/2, delay], so retries spread out but never drop to zero.
 */
export function retryDelayMs(
  policy: RetryPolicy,
  failedAttempt: number,
  random: () => number = Math.random,
): number {
  if (!Number.isInteger(failedAttempt) || failedAttempt < 1) {
    throw new RangeError(`failedAttempt must be a positive integer, got ${failedAttempt}`);
  }
  const backoff = policy.initialDelayMs * policy.backoffMultiplier ** (failedAttempt - 1);
  const delay = Math.min(policy.maxDelayMs, backoff);
  return Math.round(policy.jitter ? delay / 2 + (random() * delay) / 2 : delay);
}

export function shouldRetry(
  policy: RetryPolicy,
  failedAttempt: number,
  retryable: boolean,
): boolean {
  return retryable && failedAttempt < policy.maxAttempts;
}
