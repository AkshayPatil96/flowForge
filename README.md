# FlowForge

**Durable workflow orchestration for reliable multi-step jobs.**

FlowForge is a portfolio-grade workflow engine that lets developers define and execute multi-step workflows, persist execution state, retry failed steps, and recover after worker restarts.

> Status: Phase 0 (project setup) complete / pre-MVP  
> Primary goal: Demonstrate backend engineering depth: durable state, concurrency, idempotency, retries, failure recovery, testing, observability, and deployment.

## Local development

Prerequisites: Node.js 22+ (see `.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```sh
pnpm install
cp .env.example .env   # optional; defaults work without it
pnpm db:up             # start PostgreSQL and wait until healthy
pnpm dev               # API on http://localhost:3000 (GET /health)
```

| Command             | Purpose                               |
| ------------------- | ------------------------------------- |
| `pnpm lint`         | ESLint (type-aware)                   |
| `pnpm format:check` | Prettier check (`pnpm format` to fix) |
| `pnpm typecheck`    | `tsc --noEmit` in every package       |
| `pnpm test`         | Vitest in every package               |
| `pnpm build`        | Build every package                   |
| `pnpm db:down`      | Stop PostgreSQL (data volume is kept) |

CI (`.github/workflows/ci.yml`) runs install, format check, lint, type-check, tests and build on every push to `main` and every pull request.

### Layout

```text
apps/api/   NestJS HTTP API (versioned routes under /api/v1, /health outside it)
docs/       Product, architecture, engineering and planning docs
compose.yaml  Local PostgreSQL
```

The worker and shared `packages/*` arrive in later phases (see `docs/planning/ROADMAP.md`).

## Product boundary

FlowForge is an educational, single-tenant-first orchestration engine. It is not a Temporal replacement and must not claim exactly-once execution across arbitrary external services.

## Initial technology decisions

- Core API and worker: TypeScript + NestJS
- Durable source of truth: PostgreSQL
- Initial task coordination: PostgreSQL-backed task claiming; introduce Redis only for a justified use case
- Frontend: Next.js + TypeScript
- Local environment: Docker Compose
- Tests: unit + integration + failure-recovery tests
- CI: GitHub Actions
- Observability: structured logs first; metrics/traces incrementally
- Python: learn separately at first; later add a bounded Python task service only when the core engine is stable

## Start here

Read in this order:

1. `docs/product/PRD.md`
2. `docs/product/MVP_SCOPE.md`
3. `docs/architecture/TECHNICAL_DESIGN.md`
4. `docs/architecture/DATA_MODEL.md`
5. `docs/architecture/API_CONTRACT.md`
6. `docs/engineering/TEST_STRATEGY.md`
7. `docs/planning/ROADMAP.md`
8. `docs/engineering/DEFINITION_OF_DONE.md`
9. `docs/architecture/ADR-001-core-stack.md`

## First milestone

Before building the dashboard, make this scenario pass in an automated integration test:

1. Submit a workflow with four steps.
2. Let steps 1 and 2 succeed.
3. Force the worker to terminate while step 3 is running.
4. Restart the worker.
5. Recover the execution and finish the workflow.
6. Verify that steps 1 and 2 were not executed again and that no duplicate business side effect was created in the test fixture.

This is the core proof of value. The dashboard is secondary.

## Working principles

- Persist state before acknowledging important transitions.
- Make retries explicit and bounded.
- Treat external side effects as potentially ambiguous after a crash.
- Use idempotency keys and reconciliation where appropriate.
- Prefer a small, tested design over premature microservices.
- Document guarantees and limitations honestly.
