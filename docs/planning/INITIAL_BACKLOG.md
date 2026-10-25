# Initial Backlog

Use these as GitHub issues. Each issue should have acceptance criteria and a test plan.

Status: Epic 0 done (Phase 0). Epic 1 done and the workflow-definition parts of Epics 2 and 3 done (Phase 1, 2026-10-25). Next: Phase 2, durable submission (executions, steps, idempotency).

## Epic 0 — Repository and developer experience ✅

- [x] Create monorepo or clearly separated apps/packages. _pnpm workspace: `apps/*`, `packages/*`._
- [x] Add formatter, linter, type-check and test scripts. _`format:check`, `lint`, `typecheck`, `test`, `build`._
- [x] ~~Add Docker Compose for PostgreSQL.~~ Replaced by hosted Neon PostgreSQL (ADR-002); `/ready` verifies the connection.
- [x] Add `.env.example`; ensure real `.env` files are ignored.
- [x] Add GitHub Actions CI. _Install, audit, format, lint, type-check, test, build; green on `main`._
- [x] Document one-command local startup. _README "Local development": `pnpm dev`._

## Epic 1 — Domain model ✅

- [x] Define execution and step enums. _`src/domain/workflow-status.ts`._
- [x] Implement transition validation. _Explicit allow-list; anything else raises `INVALID_STATE_TRANSITION`._
- [x] Implement retry policy value object. _Bounded attempts, capped exponential backoff, equal jitter._
- [x] Validate workflow definition schema. _zod; unique step keys, 1-50 steps, unknown fields rejected._
- [x] Add unit tests for invalid transitions. _Every from/to pair is checked._

## Epic 2 — Persistence

- [x] Create workflow definitions/version migrations. _`0001_workflow_definitions.sql`, immutable versions via trigger._
- [ ] Create executions/steps/attempts migrations.
- [ ] Add repository methods. _Partial: workflow definitions/versions done; executions in Phase 2._
- [ ] Add uniqueness constraints for workflow versions, step keys and idempotency. _Partial: workflow names and versions done; step keys and idempotency in Phase 2._
- [ ] Add indexes based on initial query patterns.
- [ ] Add repository integration tests. _Partial: schema constraints and workflow repository covered against Neon._

## Epic 3 — API

- [x] Create workflow definition endpoint. _Plus add-version, list, get and get-version endpoints._
- [ ] Create execution submission endpoint.
- [ ] Add Idempotency-Key behavior.
- [ ] Create execution detail endpoint.
- [ ] Create step and attempt history endpoints.
- [x] Standardize error response format. _`{ error: { code, message, details? }, requestId }`._
- [x] Add request correlation ID. _`X-Request-Id` accepted or generated, echoed, logged._

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

- [ ] Add structured logs. _Partial: JSON logs with request IDs; execution/step/attempt IDs come with the worker._
- [ ] Add basic metrics.
- [x] Add health/readiness endpoints. _`GET /health` (liveness), `GET /ready` (database check), done early in Phase 0._
- [ ] Add production Docker build.
- [ ] Deploy API and worker.
- [ ] Write architecture diagram and ADRs. _ADR-001 and ADR-002 written; diagram pending._
- [ ] Record demo video.
- [ ] Publish benchmark methodology/results.
- [ ] Prepare interview explanation and known limitations.
