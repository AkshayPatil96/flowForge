# Initial Backlog

Use these as GitHub issues. Each issue should have acceptance criteria and a test plan.

## Epic 0 — Repository and developer experience
- [ ] Create monorepo or clearly separated apps/packages.
- [ ] Add formatter, linter, type-check and test scripts.
- [ ] Add Docker Compose for PostgreSQL.
- [ ] Add `.env.example`; ensure real `.env` files are ignored.
- [ ] Add GitHub Actions CI.
- [ ] Document one-command local startup.

## Epic 1 — Domain model
- [ ] Define execution and step enums.
- [ ] Implement transition validation.
- [ ] Implement retry policy value object.
- [ ] Validate workflow definition schema.
- [ ] Add unit tests for invalid transitions.

## Epic 2 — Persistence
- [ ] Create workflow definitions/version migrations.
- [ ] Create executions/steps/attempts migrations.
- [ ] Add repository methods.
- [ ] Add uniqueness constraints for workflow versions, step keys and idempotency.
- [ ] Add indexes based on initial query patterns.
- [ ] Add repository integration tests.

## Epic 3 — API
- [ ] Create workflow definition endpoint.
- [ ] Create execution submission endpoint.
- [ ] Add Idempotency-Key behavior.
- [ ] Create execution detail endpoint.
- [ ] Create step and attempt history endpoints.
- [ ] Standardize error response format.
- [ ] Add request correlation ID.

## Epic 4 — Worker and reliability
- [ ] Implement handler registry.
- [ ] Implement atomic task claim.
- [ ] Implement one-step execution and persisted attempt lifecycle.
- [ ] Implement retry scheduling.
- [ ] Implement lease expiry/recovery.
- [ ] Implement graceful shutdown.
- [ ] Add worker crash integration test.
- [ ] Add concurrent worker test.
- [ ] Add ambiguous side-effect test fixture.

## Epic 5 — Dashboard
- [ ] List executions.
- [ ] Filter by status/workflow.
- [ ] Show execution detail and step timeline.
- [ ] Show attempt/error details.
- [ ] Add manual retry confirmation.
- [ ] Add loading, empty, error and unauthorized states.

## Epic 6 — Delivery and portfolio
- [ ] Add structured logs.
- [ ] Add basic metrics.
- [ ] Add health/readiness endpoints.
- [ ] Add production Docker build.
- [ ] Deploy API and worker.
- [ ] Write architecture diagram and ADRs.
- [ ] Record demo video.
- [ ] Publish benchmark methodology/results.
- [ ] Prepare interview explanation and known limitations.
