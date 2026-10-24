# Product Requirements Document (PRD)

## 1. Product summary

**Product name:** FlowForge  
**Product type:** Developer platform / durable workflow orchestration engine  
**Status:** Draft for implementation  
**Primary user:** Backend developer integrating a multi-step process  
**Primary outcome:** A workflow can make progress across process failures without losing its recorded state.

## 2. Problem statement

Many backend processes consist of several dependent steps: validate an order, reserve inventory, request payment, and send a notification. A naïve implementation often chains function calls or background jobs without a durable execution model. If a process crashes, a job is duplicated, or a downstream service times out, the system can lose track of what completed and what remains.

FlowForge provides durable workflow state, step-level execution history, bounded retries, and recovery after worker restart.

## 3. Target users and jobs-to-be-done

### Primary persona: Backend developer

- Wants to define a sequence of tasks through an API or TypeScript SDK.
- Needs to inspect execution status and failure details.
- Wants predictable retry and recovery behavior.
- Needs a local development environment and clear integration contract.

### Secondary persona: Operator / maintainer

- Wants to identify failed or stuck executions.
- Needs execution history, attempt counts, timestamps, and error summaries.
- Needs safe manual retry controls and operational health signals.

## 4. Goals

1. Persist workflow definitions and execution state in PostgreSQL.
2. Execute multi-step workflows through one or more worker processes.
3. Retry eligible failures with configurable bounded policies.
4. Recover pending or abandoned work after worker restarts.
5. Prevent duplicate task claims through atomic coordination.
6. Make duplicate workflow submissions safely detectable.
7. Expose APIs for workflow submission and execution inspection.
8. Prove behavior with automated failure-recovery tests.
9. Provide a small UI for inspecting executions after the engine is reliable.

## 5. Non-goals for the MVP

- General-purpose visual workflow designer.
- Arbitrary user-supplied code execution.
- Multi-region or multi-tenant enterprise control plane.
- Exactly-once side effects across arbitrary third-party APIs.
- Full Temporal feature parity, deterministic replay, or a general-purpose workflow DSL.
- Kubernetes operator or self-service cloud offering.
- Kafka in the first milestone.
- Complex compensation/Saga authoring UI.
- AI as a required part of the core execution engine.

## 6. Core user journey

1. A developer defines a workflow with a name, input schema, and ordered steps.
2. The developer submits an execution request with input data and an idempotency key.
3. FlowForge stores the execution and schedules the first eligible step.
4. A worker atomically claims a step and records an attempt.
5. The worker executes the step and persists its outcome.
6. On transient failure, the step is retried according to policy.
7. If the worker dies, a recovery process detects abandoned work and makes it eligible again under defined rules.
8. The developer inspects status, attempts, outputs, and errors through the API/UI.

## 7. Functional requirements

### Workflow definitions

- FR-01: Create and retrieve a versioned workflow definition.
- FR-02: A workflow definition contains ordered steps with stable step identifiers.
- FR-03: Validate a definition before accepting it.
- FR-04: A running execution uses an immutable definition version.

### Execution

- FR-05: Submit an execution with JSON input.
- FR-06: Return a stable execution ID.
- FR-07: Track execution and step states.
- FR-08: Execute steps in defined order for MVP.
- FR-09: Persist each step attempt and its terminal result.
- FR-10: Expose execution detail and ordered step history.

### Reliability

- FR-11: Support bounded retry policies with delay/backoff.
- FR-12: Support per-step timeout configuration.
- FR-13: Recover work abandoned by a worker process.
- FR-14: Prevent simultaneous valid claims of the same task using atomic database coordination.
- FR-15: Accept an idempotency key for execution submission and return the existing execution for a repeated equivalent request.
- FR-16: Record error class, safe error message, attempt count, and timestamps.
- FR-17: Allow a permitted failed execution/step to be manually retried with an audit record.
- FR-18: Distinguish a task being retried from a task whose external side effect may have succeeded but whose result was not persisted.

### Operations and UI

- FR-19: List executions with status and creation time.
- FR-20: Filter executions by status and workflow.
- FR-21: Show step timeline, attempt history, and errors.
- FR-22: Show worker health and basic queue depth / pending task counts.
- FR-23: Provide a safe health/readiness endpoint.

## 8. Non-functional requirements

- NFR-01 Durability: accepted execution state is committed to PostgreSQL before the API acknowledges acceptance.
- NFR-02 Consistency: state transitions are validated and performed atomically.
- NFR-03 Recovery: an integration test demonstrates recovery after worker termination.
- NFR-04 Security: secrets are not stored in workflow input/output logs; API input is validated.
- NFR-05 Observability: requests and executions have correlation IDs; logs are structured.
- NFR-06 Maintainability: core state transitions are covered by unit tests.
- NFR-07 Reproducibility: a developer can start the system locally with documented commands.
- NFR-08 Performance: establish a baseline benchmark with a documented environment and workload; do not promise a target before measuring.
- NFR-09 Resource safety: retries and execution loops are bounded; payload size limits are configured.
- NFR-10 Data integrity: database constraints enforce uniqueness and valid relationships where practical.

## 9. Reliability contract and explicit limitations

- The engine provides durable state and at-least-once task execution semantics for recoverable tasks.
- A task can run more than once if the worker crashes after performing a side effect but before persisting success.
- Exactly-once effects cannot be guaranteed for arbitrary external systems by the workflow engine alone.
- Side-effecting task handlers should use idempotency keys, deduplication, transactional outbox/inbox patterns, or reconciliation.
- The first version supports sequential steps only. Parallel branches and complex compensation are future scope.
- Timeout means the engine stops waiting / marks an attempt according to policy; it does not guarantee an external operation was cancelled.

## 10. Success metrics

MVP success is demonstrated by:

- All core state-transition tests pass.
- A worker-kill integration test proves recovery.
- Duplicate submission test returns the same execution for the same idempotency key.
- Concurrent worker test demonstrates one valid claim per task lease.
- Retry test proves bounded attempts and expected final status.
- Local setup works from a clean checkout using documented instructions.
- A deployed demo and a short failure-recovery video are available.
- Benchmarks include workload, machine/container resources, result values, and limitations.

## 11. Risks and mitigations

| Risk                             | Mitigation                                                           |
| -------------------------------- | -------------------------------------------------------------------- |
| Scope becomes too large          | Freeze MVP scope; no visual editor, Kafka, or Kubernetes initially   |
| Retries duplicate side effects   | Document at-least-once semantics; idempotency and reconciliation     |
| Concurrency bugs                 | Atomic claims, leases, constraints, deterministic integration tests  |
| Database becomes a bottleneck    | Measure before adding Redis or Kafka                                 |
| Framework hides core concepts    | Keep state machine and persistence boundaries explicit               |
| Project becomes a tutorial clone | Publish failure tests, design decisions, benchmarks, and limitations |

## 12. Open questions to resolve before implementation

- What is the maximum supported input/output payload size?
- Are workflow definitions edited in place or immutable by version? Recommended: immutable versions.
- What manual retry actions are permitted? Recommended: retry only terminally failed steps/executions under explicit rules.
- What retention policy applies to execution history? Start with no automatic deletion in local MVP; document production retention as future work.
- What authentication is needed for the public demo? At minimum, protect mutating endpoints and do not expose administrative actions publicly.
