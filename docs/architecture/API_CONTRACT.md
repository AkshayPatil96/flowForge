# API Contract (MVP)

Base path: `/api/v1`

Request and response schemas are defined with zod (see ADR-003). Generated OpenAPI is still planned: zod schemas can be exported as JSON Schema when that is added. Sections marked **Implemented** describe the actual behavior; the rest is still illustrative.

## Conventions (Implemented)

- JSON field names are camelCase. Timestamps are ISO-8601 UTC strings.
- Request bodies are limited to 100 KB (larger: `413 PAYLOAD_TOO_LARGE`).
- Unknown fields in request bodies and query strings are rejected, so typos are not silently ignored.
- Invalid body, path or query values return `400 VALIDATION_FAILED` with per-field `details`.
- Every response carries an `X-Request-Id` header. A caller-supplied `X-Request-Id` is reused if it is 1-128 characters of `A-Z a-z 0-9 . _ -`; otherwise a UUID is generated.
- List endpoints take `?limit=` (1-100, default 20) and `?offset=` (default 0) and return `{ "items": [...], "page": { "limit", "offset", "total" } }`.

## Workflow definitions (Implemented)

A workflow has a unique name and one or more immutable versions. Executions (Phase 2) will always reference a specific version.

### `POST /workflows`

Create a workflow definition and its version 1 (one transaction).

Request:

```json
{
  "name": "order-processing",
  "description": "Validate, reserve inventory, process payment, notify",
  "definition": {
    "steps": [
      { "key": "validate-order", "handler": "validateOrder" },
      { "key": "reserve-inventory", "handler": "reserveInventory" },
      {
        "key": "process-payment",
        "handler": "processPayment",
        "retryPolicy": { "maxAttempts": 5 },
        "timeoutMs": 30000
      },
      {
        "key": "send-notification",
        "handler": "sendNotification",
        "config": { "channel": "email" }
      }
    ]
  }
}
```

Rules:

- `name`: lowercase kebab-case, at most 64 characters, unique.
- `description`: optional, at most 500 characters.
- `definition.steps`: 1-50 steps, run in array order (sequential MVP).
  - `key`: lowercase kebab-case, at most 64 characters, unique within the definition.
  - `handler`: identifier (`^[A-Za-z][A-Za-z0-9]*$`). Whether the handler exists is checked once the worker's handler registry exists (Phase 3).
  - `config`: optional JSON object, default `{}`.
  - `retryPolicy`: optional; omitted fields get defaults — `maxAttempts` 3 (1-20), `initialDelayMs` 1000 (100-3600000), `maxDelayMs` 60000 (100-3600000, at least `initialDelayMs`), `backoffMultiplier` 2 (1-10), `jitter` true.
  - `timeoutMs`: optional, 100-3600000.

The stored definition is normalized: defaults are written into it, so a stored version keeps its meaning even if code defaults change later.

Response: `201 Created`

```json
{
  "id": "uuid",
  "name": "order-processing",
  "description": "Validate, reserve inventory, process payment, notify",
  "latestVersion": 1,
  "createdAt": "2026-10-25T08:00:00.000Z",
  "updatedAt": "2026-10-25T08:00:00.000Z"
}
```

Errors: `400 VALIDATION_FAILED`, `409 WORKFLOW_NAME_TAKEN`.

### `POST /workflows/:workflowId/versions`

Add the next version. Request: `{ "definition": { ... } }` (same rules as above).

Response: `201 Created` with a version object (see below). Concurrent requests receive distinct, consecutive version numbers. Updates the workflow's `updatedAt`.

Errors: `400 VALIDATION_FAILED`, `404 WORKFLOW_NOT_FOUND`.

### `GET /workflows`

List workflows, newest first. Each item has the same shape as the `POST /workflows` response.

### `GET /workflows/:workflowId`

Return the workflow with its `latestVersion`. Errors: `400 VALIDATION_FAILED` (malformed UUID), `404 WORKFLOW_NOT_FOUND`.

### `GET /workflows/:workflowId/versions/:version`

Return an immutable version:

```json
{
  "workflowId": "uuid",
  "version": 1,
  "definition": { "steps": [ ... ] },
  "createdAt": "2026-10-25T08:00:00.000Z"
}
```

Errors: `400 VALIDATION_FAILED`, `404 WORKFLOW_VERSION_NOT_FOUND`.

## Executions

### `POST /workflows/:workflowId/versions/:version/executions`

Submit an execution. Require `Idempotency-Key` header.

Request:

```json
{
  "input": {
    "orderId": "order-123"
  }
}
```

Response: `202 Accepted`

```json
{
  "executionId": "uuid",
  "status": "PENDING",
  "createdAt": "ISO-8601 timestamp"
}
```

Behavior:

- Same idempotency key and same request hash: return existing execution.
- Same idempotency key with different request hash: return `409 Conflict`.
- Invalid definition/input: return `400 Bad Request` or `422 Unprocessable Entity`, consistently documented.

### `GET /executions`

List executions. Support pagination and filters such as `status`, `workflowId`, `createdAfter`, `createdBefore`.

### `GET /executions/:executionId`

Return status, workflow version, timestamps, and sanitized output/error summary.

### `GET /executions/:executionId/steps`

Return ordered step states and attempt summaries.

### `GET /executions/:executionId/steps/:stepKey/attempts`

Return attempt history for a step.

### `POST /executions/:executionId/retry`

Request manual retry for an eligible failed execution. Require authorization and an audit record.

## Operational endpoints (Implemented)

Outside the `/api/v1` prefix.

- `GET /health`: process liveness only, `200 { "status": "ok" }`. Never touches the database.
- `GET /ready`: runs `SELECT 1`. `200 { "status": "ok" }`, or `503 DATABASE_UNAVAILABLE`.
- Do not expose internal diagnostics or secrets publicly.

## Common error response (Implemented)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "details": [{ "path": "definition.steps.1.key", "message": "duplicate step key \"a\"" }]
  },
  "requestId": "3f1c2c3e-5d2a-4a7e-9c1b-2b6f0e9d8a10"
}
```

- `details` appears only on validation errors.
- 4xx messages are safe to show. 5xx responses always return `500 INTERNAL_ERROR` with a generic message; the real error is logged with the request ID.
- Other generic codes come from the HTTP status, e.g. `NOT_FOUND`, `BAD_REQUEST` (malformed JSON), `PAYLOAD_TOO_LARGE`.

| Code                         | Status | When                                    |
| ---------------------------- | ------ | --------------------------------------- |
| `VALIDATION_FAILED`          | 400    | Invalid body, path or query             |
| `WORKFLOW_NOT_FOUND`         | 404    | Unknown workflow ID                     |
| `WORKFLOW_VERSION_NOT_FOUND` | 404    | Unknown version of an existing workflow |
| `WORKFLOW_NAME_TAKEN`        | 409    | Workflow name already used              |
| `INVALID_STATE_TRANSITION`   | 409    | State change not allowed (Phase 2+)     |
| `DATABASE_UNAVAILABLE`       | 503    | `/ready` cannot reach the database      |
| `INTERNAL_ERROR`             | 500    | Anything unexpected                     |

## API design requirements

- Use consistent pagination and error formats.
- Validate body, path and query parameters.
- Avoid returning stack traces to clients.
- Redact secrets and sensitive fields.
- Document idempotency behavior and status transitions.
- Add contract/integration tests for all mutating endpoints.
