import { describe, expect, it } from 'vitest';
import { DEFAULT_RETRY_POLICY } from './retry-policy.js';
import { MAX_STEPS, workflowDefinitionSchema, workflowNameSchema } from './workflow-definition.js';

const step = (key: string) => ({ key, handler: 'noop' });

describe('workflowDefinitionSchema', () => {
  it('accepts the four-step order example and applies defaults', () => {
    const parsed = workflowDefinitionSchema.parse({
      steps: [
        { key: 'validate-order', handler: 'validateOrder', config: {} },
        { key: 'reserve-inventory', handler: 'reserveInventory' },
        {
          key: 'process-payment',
          handler: 'processPayment',
          retryPolicy: { maxAttempts: 5 },
          timeoutMs: 30_000,
        },
        { key: 'send-notification', handler: 'sendNotification' },
      ],
    });

    expect(parsed.steps.map((s) => s.key)).toEqual([
      'validate-order',
      'reserve-inventory',
      'process-payment',
      'send-notification',
    ]);
    expect(parsed.steps[1]).toEqual({
      key: 'reserve-inventory',
      handler: 'reserveInventory',
      config: {},
      retryPolicy: DEFAULT_RETRY_POLICY,
    });
    expect(parsed.steps[2]?.retryPolicy.maxAttempts).toBe(5);
    expect(parsed.steps[2]?.timeoutMs).toBe(30_000);
  });

  it('rejects an empty step list', () => {
    expect(workflowDefinitionSchema.safeParse({ steps: [] }).success).toBe(false);
  });

  it(`rejects more than ${MAX_STEPS} steps`, () => {
    const steps = Array.from({ length: MAX_STEPS + 1 }, (_, i) => step(`step-${i}`));
    expect(workflowDefinitionSchema.safeParse({ steps }).success).toBe(false);
  });

  it('rejects duplicate step keys and points at the duplicate', () => {
    const result = workflowDefinitionSchema.safeParse({
      steps: [step('a'), step('b'), step('a')],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['steps', 2, 'key']);
  });

  it.each(['Upper', 'has space', '-leading', 'trailing-', 'double--dash', '', 'x'.repeat(65)])(
    'rejects step key %j',
    (key) => {
      expect(workflowDefinitionSchema.safeParse({ steps: [step(key)] }).success).toBe(false);
    },
  );

  it.each(['1startsWithDigit', 'has-dash', 'has space', ''])('rejects handler %j', (handler) => {
    expect(workflowDefinitionSchema.safeParse({ steps: [{ key: 'a', handler }] }).success).toBe(
      false,
    );
  });

  it('rejects unknown fields so typos are not silently ignored', () => {
    const result = workflowDefinitionSchema.safeParse({
      steps: [{ key: 'a', handler: 'noop', retrypolicy: {} }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid nested retry policy', () => {
    const result = workflowDefinitionSchema.safeParse({
      steps: [{ key: 'a', handler: 'noop', retryPolicy: { maxAttempts: 0 } }],
    });
    expect(result.success).toBe(false);
  });

  it.each([0, 99, 3_600_001, 1.5])('rejects timeoutMs %s', (timeoutMs) => {
    const result = workflowDefinitionSchema.safeParse({
      steps: [{ key: 'a', handler: 'noop', timeoutMs }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-object step config', () => {
    const result = workflowDefinitionSchema.safeParse({
      steps: [{ key: 'a', handler: 'noop', config: [1, 2] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('workflowNameSchema', () => {
  it.each(['order-processing', 'a', 'v2-import'])('accepts %j', (name) => {
    expect(workflowNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['Order', 'order processing', '', 'x'.repeat(65)])('rejects %j', (name) => {
    expect(workflowNameSchema.safeParse(name).success).toBe(false);
  });
});
