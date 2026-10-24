# MVP Scope and Acceptance Criteria

## MVP principle

Prove durable execution before building a sophisticated UI or adding infrastructure tools.

## In scope — MVP 1

- Versioned, sequential workflow definitions.
- Workflow submission with an idempotency key.
- PostgreSQL persistence for definitions, executions, steps, and attempts.
- A worker process that atomically claims eligible work.
- Step states and execution states.
- Bounded retries with backoff.
- Lease/heartbeat or equivalent abandoned-worker detection.
- Manual retry for eligible failed executions.
- REST API for create/submit/read/list.
- Structured logs and correlation IDs.
- Docker Compose local development.
- Unit and integration tests, including worker termination.
- Basic execution-history UI only after engine acceptance criteria pass.

## Explicitly out of scope

- Parallel branches, loops, human approval tasks.
- Arbitrary script execution.
- Multi-region operation.
- Kubernetes deployment.
- Kafka integration.
- Distributed scheduling across time zones.
- Workflow marketplace.
- AI-generated workflows.
- Full RBAC and enterprise multi-tenancy.

## Acceptance criteria

### AC-01: Workflow submission

Given a valid workflow definition and input, when a client submits an execution, then the API returns an execution ID and the execution is durably stored before acceptance is returned.

### AC-02: Duplicate submission

Given an existing execution created with idempotency key K, when an equivalent request with K is submitted again, then the API returns the existing execution rather than creating a duplicate.

### AC-03: Sequential execution

Given four successful steps, when a workflow runs, then steps execute in the defined order and the execution becomes completed.

### AC-04: Retry

Given a step fails with a retryable error and retries remain, then the engine records the attempt and schedules another attempt according to policy.

### AC-05: Retry exhaustion

Given all attempts fail, then the step and execution become failed with inspectable error information.

### AC-06: Worker recovery

Given steps 1 and 2 succeeded and a worker dies during step 3, when a worker restarts and the lease expires or recovery rule triggers, then execution resumes according to the documented at-least-once semantics.

### AC-07: Concurrency

Given two workers attempt to claim the same eligible task concurrently, then only one obtains the current valid lease.

### AC-08: External side-effect ambiguity

Given a task performs a side effect and the worker dies before recording success, then the system does not claim exactly-once behavior; the task contract/test demonstrates idempotency or reconciliation.

### AC-09: Manual retry

Given a terminally failed execution that is eligible for retry, when an authorized operator requests retry, then a new attempt/audit record is created and the policy is respected.

### AC-10: Observability

Given a failed execution, an operator can identify the step, attempt, timestamps, and sanitized error without reading raw database records.

## Release gates

Do not call the MVP complete until AC-01 through AC-08 pass in automated tests. UI polish is not a substitute for these gates.
