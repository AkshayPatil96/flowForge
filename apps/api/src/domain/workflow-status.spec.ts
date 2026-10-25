import { describe, expect, it } from 'vitest';
import { DomainError } from './domain-error.js';
import {
  EXECUTION_STATUSES,
  STEP_STATUSES,
  assertExecutionTransition,
  assertStepTransition,
  canTransitionExecution,
  canTransitionStep,
  type ExecutionStatus,
  type StepStatus,
} from './workflow-status.js';

// Expected rules, written out independently of the implementation's table.
const ALLOWED_EXECUTION: [ExecutionStatus, ExecutionStatus][] = [
  ['PENDING', 'RUNNING'],
  ['PENDING', 'CANCELLED'],
  ['RUNNING', 'RETRY_WAIT'],
  ['RUNNING', 'COMPLETED'],
  ['RUNNING', 'FAILED'],
  ['RUNNING', 'CANCELLED'],
  ['RETRY_WAIT', 'RUNNING'],
  ['RETRY_WAIT', 'CANCELLED'],
  ['FAILED', 'PENDING'],
];

const ALLOWED_STEP: [StepStatus, StepStatus][] = [
  ['PENDING', 'READY'],
  ['READY', 'RUNNING'],
  ['RUNNING', 'SUCCEEDED'],
  ['RUNNING', 'RETRY_WAIT'],
  ['RUNNING', 'FAILED'],
  ['RUNNING', 'UNKNOWN'],
  ['RUNNING', 'READY'],
  ['RETRY_WAIT', 'READY'],
  ['UNKNOWN', 'READY'],
  ['UNKNOWN', 'SUCCEEDED'],
  ['UNKNOWN', 'FAILED'],
  ['FAILED', 'READY'],
];

function allPairs<T extends string>(values: readonly T[]): [T, T][] {
  return values.flatMap((from) => values.map((to): [T, T] => [from, to]));
}

const isAllowed = <T>(allowed: [T, T][], from: T, to: T) =>
  allowed.some(([f, t]) => f === from && t === to);

describe('execution status transitions', () => {
  it.each(allPairs(EXECUTION_STATUSES))('%s -> %s', (from, to) => {
    expect(canTransitionExecution(from, to)).toBe(isAllowed(ALLOWED_EXECUTION, from, to));
  });

  it('treats COMPLETED and CANCELLED as terminal', () => {
    for (const to of EXECUTION_STATUSES) {
      expect(canTransitionExecution('COMPLETED', to)).toBe(false);
      expect(canTransitionExecution('CANCELLED', to)).toBe(false);
    }
  });

  it('throws INVALID_STATE_TRANSITION for a rejected transition', () => {
    expect(() => assertExecutionTransition('COMPLETED', 'RUNNING')).toThrow(DomainError);
    expect(() => assertExecutionTransition('COMPLETED', 'RUNNING')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
  });

  it('does not throw for an allowed transition', () => {
    expect(() => assertExecutionTransition('PENDING', 'RUNNING')).not.toThrow();
  });
});

describe('step status transitions', () => {
  it.each(allPairs(STEP_STATUSES))('%s -> %s', (from, to) => {
    expect(canTransitionStep(from, to)).toBe(isAllowed(ALLOWED_STEP, from, to));
  });

  it('treats SUCCEEDED as terminal', () => {
    for (const to of STEP_STATUSES) expect(canTransitionStep('SUCCEEDED', to)).toBe(false);
  });

  it('never allows a step to stay in place (no self-transitions)', () => {
    for (const s of STEP_STATUSES) expect(canTransitionStep(s, s)).toBe(false);
  });

  it('throws INVALID_STATE_TRANSITION with both states in the message', () => {
    expect(() => assertStepTransition('PENDING', 'SUCCEEDED')).toThrow(/PENDING -> SUCCEEDED/);
  });
});
