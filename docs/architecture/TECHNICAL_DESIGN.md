# Technical Design

## 1. Architectural style

Start as a modular monolith with separate API and worker processes. They share a codebase and domain model but can run independently. This keeps deployment manageable while allowing the worker to restart independently of the API.

## 2. Components

### API service (NestJS)

Responsibilities:

- Validate requests.
- Manage versioned workflow definitions.
- Accept execution submissions.
- Persist initial execution state.
- Expose read/list endpoints.
- Validate operator retry requests.
- Never run long workflow steps inside the HTTP request.

### Workflow domain module

Responsibilities:

- State machine and transition rules.
- Retry policy calculation.
- Eligibility rules.
- Workflow definition validation.
- Idempotency semantics.
- Domain-level errors.

Keep this module as independent of NestJS as practical.

### Persistence module (PostgreSQL)

Responsibilities:

- Durable workflow definitions and versions.
- Execution and step state.
- Attempt history.
- Atomic task claiming and state transitions.
- Constraints and transactions.

### Worker process

Responsibilities:

- Poll/claim eligible steps.
- Execute registered handlers.
- Record attempt start and result.
- Renew lease/heartbeat if implemented.
- Respect cancellation/timeout policy where possible.
- Exit safely on shutdown.

### Recovery process

Responsibilities:

- Detect expired leases or abandoned running attempts.
- Mark attempts as abandoned/unknown as appropriate.
- Requeue only according to documented recovery rules.
- Avoid silently declaring an uncertain side effect successful.

For the MVP, recovery can be part of the worker process rather than a separate deployable service.

### Dashboard (Next.js)

Responsibilities:

- List workflow definitions and executions.
- Show execution/step state, attempts, durations and sanitized errors.
- Trigger permitted manual retries.
- Do not duplicate business rules that belong in the API.

## 3. Execution flow

1. Client submits an execution with an idempotency key.
2. API validates definition version and input.
3. API transaction inserts execution and step records (or an initial task record).
4. API commits and returns execution ID.
5. Worker claims eligible work using an atomic database operation.
6. Worker records attempt start and lease details.
7. Handler executes outside the database transaction.
8. Worker persists success or failure in a short transaction.
9. On failure, policy decides retry eligibility and next available time.
10. Recovery identifies expired leases and re-enables work under defined rules.
11. UI reads execution state from API.

Do not hold a database transaction open while calling a slow external service.

## 4. State model

### Execution states

- `PENDING`: accepted but not yet started.
- `RUNNING`: at least one step is being processed.
- `RETRY_WAIT`: no step is currently running; a retry is scheduled.
- `COMPLETED`: all steps completed successfully.
- `FAILED`: execution cannot progress without an explicit operator action.
- `CANCELLED`: cancellation requested and safely finalized according to MVP rules, if cancellation is implemented.

### Step states

- `PENDING`: eligible in the future after dependencies are met.
- `READY`: eligible to claim.
- `RUNNING`: a worker holds a valid lease.
- `RETRY_WAIT`: a retry is scheduled for a future time.
- `SUCCEEDED`: result persisted.
- `FAILED`: retry policy exhausted or non-retryable error.
- `UNKNOWN`: prior attempt outcome may be ambiguous after a crash.

Do not use `UNKNOWN` as a substitute for all worker crashes. Define precisely when the system cannot know whether a side effect occurred.

## 5. Retry policy

Initial policy fields:

- `maxAttempts`
- `initialDelayMs`
- `maxDelayMs`
- `backoffMultiplier`
- `retryableErrorCodes` or a handler-defined retryability result
- optional jitter

Requirements:

- Bound maximum attempts.
- Store attempt number and next eligible timestamp.
- Avoid tight retry loops.
- Do not retry known non-retryable validation errors by default.
- Make timeout and external cancellation semantics explicit.

## 6. Task claiming and leases

Use a PostgreSQL transaction and an atomic claim pattern, potentially with `FOR UPDATE SKIP LOCKED`, to select eligible work and mark it claimed. Verify exact SQL and transaction behavior with integration tests.

Lease metadata may include:

- `lease_owner`
- `lease_expires_at`
- `heartbeat_at`
- `attempt_id`

A lease reduces concurrent ownership but does not prevent a paused worker from later resuming and performing an external side effect. Use fencing tokens or idempotency where required by the operation.

## 7. Idempotency

For execution submission:

- Require or strongly encourage a client-supplied idempotency key.
- Enforce uniqueness in the database within a defined scope.
- Store a request hash so reuse of a key with different input can return a conflict.
- Define retention for idempotency records.

For task handlers:

- Pass stable execution ID + step ID as a task idempotency context.
- Side-effecting handlers should propagate idempotency keys to downstream systems where supported.
- If the downstream system lacks idempotency support, define reconciliation or compensation; do not promise exactly-once effects.

## 8. Security

- Validate all external inputs.
- Keep secrets out of workflow input/output and logs.
- Redact sensitive fields in error and output serialization.
- Do not execute arbitrary code supplied by users.
- Use environment-based configuration and a secrets manager in deployed environments.
- Protect manual retry and other mutating endpoints.
- Apply payload and request-size limits.
- Use least-privilege database credentials.

## 9. Observability

Initial:

- Structured JSON logs.
- Request ID / correlation ID.
- Execution ID, workflow ID, step ID, attempt ID in log context.
- Health and readiness endpoints.
- Counters for succeeded/failed/retried executions and steps.
- Histograms for step duration and end-to-end execution duration.
- Queue depth and oldest eligible task age.

Later:

- OpenTelemetry traces across API, worker and Python service.
- Prometheus scraping and Grafana dashboards.
- Alerting for stuck work and elevated failure rate.

## 10. Deployment topology

Local:

- Next.js UI
- NestJS API
- Worker process
- PostgreSQL
- Optional Redis only when justified
- Optional Python service in a later milestone

Production demo:

- API and worker as independently restartable processes/containers.
- Managed PostgreSQL or a properly secured PostgreSQL deployment.
- TLS and secrets management.
- CI pipeline, health checks, logs, backups and a documented rollback procedure.

## 11. Scaling path

Do not scale prematurely. First establish correctness with one worker, then test multiple workers. Only add Kafka, Redis-based coordination, or Kubernetes when measured requirements or a clear architectural need justify them.
