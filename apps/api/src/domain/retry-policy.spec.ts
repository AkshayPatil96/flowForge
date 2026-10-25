import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETRY_POLICY,
  retryDelayMs,
  retryPolicySchema,
  shouldRetry,
  type RetryPolicy,
} from './retry-policy.js';

const policy: RetryPolicy = {
  maxAttempts: 5,
  initialDelayMs: 1_000,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  jitter: false,
};

describe('retryPolicySchema', () => {
  it('fills defaults for an empty policy', () => {
    expect(retryPolicySchema.parse({})).toEqual(DEFAULT_RETRY_POLICY);
  });

  it('accepts a full valid policy', () => {
    expect(retryPolicySchema.parse(policy)).toEqual(policy);
  });

  it.each([
    ['maxAttempts below 1', { maxAttempts: 0 }],
    ['maxAttempts above 20', { maxAttempts: 21 }],
    ['fractional maxAttempts', { maxAttempts: 2.5 }],
    ['initialDelayMs below 100 (tight retry loop)', { initialDelayMs: 50 }],
    ['maxDelayMs above 1 hour', { maxDelayMs: 3_600_001 }],
    ['backoffMultiplier below 1', { backoffMultiplier: 0.5 }],
    ['backoffMultiplier above 10', { backoffMultiplier: 11 }],
    ['maxDelayMs below initialDelayMs', { initialDelayMs: 5_000, maxDelayMs: 1_000 }],
    ['unknown field', { retries: 3 }],
  ])('rejects %s', (_label, input) => {
    expect(retryPolicySchema.safeParse(input).success).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it.each([
    [1, 1_000],
    [2, 2_000],
    [3, 4_000],
    [4, 8_000],
    [5, 10_000], // capped at maxDelayMs
    [12, 10_000],
  ])('attempt %i failed -> wait %i ms', (failedAttempt, expected) => {
    expect(retryDelayMs(policy, failedAttempt)).toBe(expected);
  });

  it('applies equal jitter: between half and the full backoff delay', () => {
    const jittered = { ...policy, jitter: true };
    expect(retryDelayMs(jittered, 3, () => 0)).toBe(2_000);
    expect(retryDelayMs(jittered, 3, () => 0.999_999)).toBeCloseTo(4_000, 0);
    expect(retryDelayMs(jittered, 3, () => 0.5)).toBe(3_000);
  });

  it('never returns more than maxDelayMs even with jitter', () => {
    const jittered = { ...policy, jitter: true };
    expect(retryDelayMs(jittered, 50, () => 0.999_999)).toBeLessThanOrEqual(policy.maxDelayMs);
  });

  it('rejects attempt numbers below 1', () => {
    expect(() => retryDelayMs(policy, 0)).toThrow(/failedAttempt must be a positive integer/);
  });
});

describe('shouldRetry', () => {
  it('retries a retryable failure while attempts remain', () => {
    expect(shouldRetry(policy, 1, true)).toBe(true);
    expect(shouldRetry(policy, 4, true)).toBe(true);
  });

  it('stops once maxAttempts is reached (bounded retries)', () => {
    expect(shouldRetry(policy, 5, true)).toBe(false);
  });

  it('never retries a non-retryable failure', () => {
    expect(shouldRetry(policy, 1, false)).toBe(false);
  });
});
