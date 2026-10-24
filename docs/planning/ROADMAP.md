# 12-Week Roadmap

Assumption: approximately 8–12 focused hours per week. If less time is available, extend the calendar rather than cutting reliability tests.

## Phase 0 — Project setup (Days 1–3)

- Read PRD, MVP scope, technical design, data model and ADR.
- Create GitHub repository and issue board.
- Create initial NestJS app, test/lint/type-check commands, Docker Compose with PostgreSQL.
- Add CI for install, lint, type-check and tests.
- Deliverable: clean checkout boots locally and CI is green.

## Phase 1 — Domain model (Week 1)

- Define workflow/step/execution states and allowed transitions.
- Add schema and migrations for workflow definitions and versions.
- Add unit tests for validation and state transitions.
- Deliverable: definitions can be created and validated.

## Phase 2 — Durable submission (Week 2)

- Add executions, steps, idempotency key, request hash.
- Implement submit and inspect endpoints.
- Add database constraints and concurrent duplicate-submission tests.
- Deliverable: accepted execution is durable.

## Phase 3 — Worker (Weeks 3–4)

- Implement atomic task claiming.
- Implement handler registry and sequential execution.
- Persist attempts and results.
- Add bounded retry/backoff.
- Deliverable: success, failure and retry scenarios pass.

## Phase 4 — Recovery and concurrency (Weeks 5–6)

- Add lease/heartbeat or equivalent abandonment detection.
- Add recovery scanner and safe requeue logic.
- Test multiple workers and process termination.
- Test ambiguous side-effect failure and idempotency/reconciliation.
- Deliverable: core reliability acceptance criteria pass.

## Phase 5 — Operational API and dashboard (Weeks 7–8)

- Add listing, filtering, attempts and error details.
- Build basic Next.js execution-history UI.
- Add safe manual retry.
- Deliverable: operator can diagnose a failed execution without database access.

## Phase 6 — Observability and deployment (Weeks 9–10)

- Add structured logs, metrics, health/readiness, CI deployment.
- Deploy API and worker as independently restartable processes.
- Capture benchmark baseline.
- Deliverable: deployed demo with documented limitations.

## Phase 7 — Python service and portfolio polish (Weeks 11–12)

- Only if core engine is stable: build a small FastAPI service for a bounded task (e.g. document classification or structured extraction) with contract tests.
- Add architecture diagram, demo video, benchmark report, and design trade-offs.
- Deliverable: polished repository and interview walkthrough.

## De-scope order if behind schedule

1. Advanced UI polish.
2. Python service integration.
3. Metrics dashboards beyond essential metrics.
4. Optional Redis.
   Never de-scope core crash-recovery, idempotency, concurrency, and integration tests.
