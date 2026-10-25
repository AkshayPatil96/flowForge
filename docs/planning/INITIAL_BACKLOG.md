# Initial Backlog

Use these as GitHub issues. Each issue should have acceptance criteria and a test plan.

Status: Epic 0 done (Phase 0, 2026-10-25). Next: Epic 1 (Phase 1).

## Epic 0 — Repository and developer experience ✅

- [x] Create monorepo or clearly separated apps/packages. _pnpm workspace: `apps/*`, `packages/*`._
- [x] Add formatter, linter, type-check and test scripts. _`format:check`, `lint`, `typecheck`, `test`, `build`._
- [x] ~~Add Docker Compose for PostgreSQL.~~ Replaced by hosted Neon PostgreSQL (ADR-002); `/ready` verifies the connection.
- [x] Add `.env.example`; ensure real `.env` files are ignored.
- [x] Add GitHub Actions CI. _Install, audit, format, lint, type-check, test, build; green on `main`._
- [x] Document one-command local startup. _README "Local development": `pnpm dev`._

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
- [x] Add health/readiness endpoints. _`GET /health` (liveness), `GET /ready` (database check), done early in Phase 0._
- [ ] Add production Docker build.
- [ ] Deploy API and worker.
- [ ] Write architecture diagram and ADRs. _ADR-001 and ADR-002 written; diagram pending._
- [ ] Record demo video.
- [ ] Publish benchmark methodology/results.
- [ ] Prepare interview explanation and known limitations.
