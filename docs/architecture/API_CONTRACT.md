# API Contract (MVP)

Base path: `/api/v1`

Use OpenAPI generated from NestJS decorators and validate the generated contract in CI. The examples below are illustrative; finalize exact schemas during implementation.

## Workflow definitions

### `POST /workflows`
Create a workflow definition and its initial version.

Request:
```json
{
  "name": "order-processing",
  "description": "Validate, reserve inventory, process payment, notify",
  "definition": {
    "steps": [
      { "key": "validate-order", "handler": "validateOrder", "config": {} },
      { "key": "reserve-inventory", "handler": "reserveInventory", "config": {} },
      { "key": "process-payment", "handler": "processPayment", "config": {} },
      { "key": "send-notification", "handler": "sendNotification", "config": {} }
    ]
  }
}
```

Response: `201 Created` with workflow ID and version.

### `GET /workflows`
List workflow definitions with pagination.

### `GET /workflows/:workflowId`
Return workflow metadata and current version.

### `GET /workflows/:workflowId/versions/:version`
Return immutable version definition.

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

## Operational endpoints

- `GET /health`: process health only.
- `GET /ready`: dependency/readiness check.
- Do not expose internal diagnostics or secrets publicly.

## Common error response

```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED",
    "message": "The idempotency key was previously used with a different request."
  },
  "requestId": "request-id"
}
```

## API design requirements

- Use consistent pagination and error formats.
- Validate body, path and query parameters.
- Avoid returning stack traces to clients.
- Redact secrets and sensitive fields.
- Document idempotency behavior and status transitions.
- Add contract/integration tests for all mutating endpoints.
