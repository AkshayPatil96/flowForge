# Data Model (Logical)

This is a starting point, not a final migration. Review constraints and indexes before implementation.

## workflow_definitions
- `id` UUID primary key
- `name` text
- `description` text nullable
- `created_at` timestamptz
- `updated_at` timestamptz

## workflow_versions
- `id` UUID primary key
- `workflow_id` UUID FK
- `version` integer
- `definition_json` jsonb
- `input_schema_json` jsonb nullable
- `created_at` timestamptz
- Unique (`workflow_id`, `version`)

A running execution points to an immutable version. Do not mutate the definition used by an existing execution.

## workflow_executions
- `id` UUID primary key
- `workflow_version_id` UUID FK
- `status` enum/text with check constraint
- `input_json` jsonb
- `output_json` jsonb nullable
- `idempotency_key` text
- `request_hash` text
- `created_at` timestamptz
- `started_at` timestamptz nullable
- `completed_at` timestamptz nullable
- `updated_at` timestamptz
- Unique idempotency scope, e.g. (`workflow_version_id`, `idempotency_key`) or an explicit tenant/client scope.

Decide the idempotency scope before implementing the unique index.

## workflow_steps
- `id` UUID primary key
- `execution_id` UUID FK
- `step_key` text
- `step_order` integer
- `handler_type` text
- `config_json` jsonb
- `status` enum/text with check constraint
- `attempt_count` integer
- `available_at` timestamptz
- `lease_owner` text nullable
- `lease_expires_at` timestamptz nullable
- `heartbeat_at` timestamptz nullable
- `last_error_code` text nullable
- `last_error_message` text nullable (sanitized)
- `result_json` jsonb nullable
- `created_at` timestamptz
- `updated_at` timestamptz
- Unique (`execution_id`, `step_key`)
- Unique (`execution_id`, `step_order`) for sequential MVP

## step_attempts
- `id` UUID primary key
- `step_id` UUID FK
- `attempt_number` integer
- `worker_id` text
- `status` text
- `started_at` timestamptz
- `finished_at` timestamptz nullable
- `error_code` text nullable
- `error_message` text nullable (sanitized)
- `result_summary_json` jsonb nullable
- `lease_token` bigint or UUID nullable
- Unique (`step_id`, `attempt_number`)

## Optional later tables
- `execution_events`: append-only audit/event history.
- `outbox_events`: reliable event publication.
- `worker_heartbeats`: worker health and liveness.

## Index candidates

Validate with query plans and workload:
- `workflow_executions(status, created_at DESC)`
- `workflow_steps(status, available_at)`
- `workflow_steps(lease_expires_at)` for recovery scan
- `step_attempts(step_id, attempt_number DESC)`
- Unique idempotency index
- `workflow_versions(workflow_id, version DESC)`

## Data integrity rules

- Foreign keys should prevent orphaned records.
- Attempt number must be positive.
- A step should not have more than one current valid lease.
- State transitions should be validated in application code and, where useful, constrained at the database level.
- Never persist secrets in JSON input/output without an explicit redaction/encryption design.
- Define retention and payload-size policies before exposing the system publicly.
