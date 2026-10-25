import { DomainError } from './domain-error.js';

export const EXECUTION_STATUSES = [
  'PENDING',
  'RUNNING',
  'RETRY_WAIT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const STEP_STATUSES = [
  'PENDING',
  'READY',
  'RUNNING',
  'RETRY_WAIT',
  'SUCCEEDED',
  'FAILED',
  'UNKNOWN',
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

// Anything not listed is rejected. COMPLETED and CANCELLED are terminal.
const EXECUTION_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  PENDING: ['RUNNING', 'CANCELLED'],
  RUNNING: ['RETRY_WAIT', 'COMPLETED', 'FAILED', 'CANCELLED'],
  RETRY_WAIT: ['RUNNING', 'CANCELLED'],
  // Manual retry (AC-09) puts a failed execution back in the queue.
  FAILED: ['PENDING'],
  COMPLETED: [],
  CANCELLED: [],
};

// SUCCEEDED is terminal.
const STEP_TRANSITIONS: Record<StepStatus, readonly StepStatus[]> = {
  PENDING: ['READY'],
  READY: ['RUNNING'],
  RUNNING: [
    'SUCCEEDED',
    'RETRY_WAIT',
    'FAILED',
    // The handler may have produced a side effect before the worker died.
    'UNKNOWN',
    // Recovery requeue when the lease expired before the handler started.
    'READY',
  ],
  RETRY_WAIT: ['READY'],
  // Reconciliation decides: safe to re-run, confirmed done, or give up.
  UNKNOWN: ['READY', 'SUCCEEDED', 'FAILED'],
  // Manual retry.
  FAILED: ['READY'],
  SUCCEEDED: [],
};

export function canTransitionExecution(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return EXECUTION_TRANSITIONS[from].includes(to);
}

export function canTransitionStep(from: StepStatus, to: StepStatus): boolean {
  return STEP_TRANSITIONS[from].includes(to);
}

export function assertExecutionTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransitionExecution(from, to)) throw invalidTransition('execution', from, to);
}

export function assertStepTransition(from: StepStatus, to: StepStatus): void {
  if (!canTransitionStep(from, to)) throw invalidTransition('step', from, to);
}

function invalidTransition(entity: string, from: string, to: string): DomainError {
  return new DomainError(
    'INVALID_STATE_TRANSITION',
    `Invalid ${entity} transition: ${from} -> ${to}`,
  );
}
