# Test Strategy

## Testing pyramid

### Unit tests

Test pure domain behavior without a database:

- State transition rules.
- Retry/backoff calculations.
- Workflow definition validation.
- Idempotency request hash comparison.
- Error classification and retryability.
- Execution status aggregation.

### Integration tests

Use a real PostgreSQL instance, preferably through Testcontainers or Docker Compose:

- Repository persistence and constraints.
- Atomic task claiming.
- Concurrent workers attempting the same task.
- Idempotency uniqueness under concurrent submissions.
- Lease expiry and recovery.
- Transaction rollback behavior.
- API validation and error responses.

### End-to-end tests

- Submit a workflow through the API and observe completion.
- Submit an invalid workflow and verify rejection.
- Submit the same idempotency key twice.
- Trigger a retryable failure.
- Exhaust retries and inspect the failed execution.
- Manually retry an eligible failed execution.
- Restart/kill the worker during execution and verify recovery.

## Mandatory failure scenarios

1. Worker exits before starting a step.
2. Worker exits after marking a step running but before executing its handler.
3. Worker exits after an external side effect but before recording success.
4. Worker loses database connectivity during completion.
5. Two workers race to claim one step.
6. Duplicate API submissions arrive concurrently.
7. A handler consistently fails until retries are exhausted.
8. A handler exceeds its timeout.
9. Recovery scanner runs more than once for the same abandoned step.
10. Invalid state transition is attempted.

For scenario 3, do not assert that the side effect magically happens exactly once. Test the chosen idempotency or reconciliation strategy.

## Test quality rules

- Tests must be deterministic and clean up their own data.
- Avoid arbitrary sleeps where a synchronization barrier or polling with a bounded deadline is possible.
- Use fake handlers for deterministic failure injection.
- Include at least one test that runs two workers concurrently.
- Keep production code and test-only fault injection clearly separated.
- Run tests in CI on every pull request.
- Document tests that require Docker or external services.
