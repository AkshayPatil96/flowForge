import { z } from 'zod';
import { retryPolicySchema } from './retry-policy.js';

export const MAX_STEPS = 50;

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const workflowNameSchema = z
  .string()
  .max(64)
  .regex(KEBAB_CASE, 'must be lowercase kebab-case, e.g. order-processing');

const stepSchema = z.strictObject({
  key: z.string().max(64).regex(KEBAB_CASE, 'must be lowercase kebab-case, e.g. send-email'),
  // Name of a handler registered in the worker. Existence is checked once the
  // handler registry exists (Phase 3); here only the format is enforced.
  handler: z
    .string()
    .max(64)
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'must be an identifier, e.g. sendEmail'),
  config: z.record(z.string(), z.unknown()).default(() => ({})),
  retryPolicy: retryPolicySchema.prefault({}),
  timeoutMs: z.int().min(100).max(3_600_000).optional(),
});

export const workflowDefinitionSchema = z.strictObject({
  steps: z
    .array(stepSchema)
    .min(1)
    .max(MAX_STEPS)
    .superRefine((steps, ctx) => {
      const seen = new Set<string>();
      steps.forEach((step, index) => {
        if (seen.has(step.key)) {
          ctx.addIssue({
            code: 'custom',
            message: `duplicate step key "${step.key}"`,
            path: [index, 'key'],
          });
        }
        seen.add(step.key);
      });
    }),
});

/** Sequential definition (MVP): steps run in array order. */
export type WorkflowDefinition = z.output<typeof workflowDefinitionSchema>;
