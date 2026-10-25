# FlowForge

**Durable workflow orchestration for reliable multi-step jobs.**

FlowForge is a portfolio-grade workflow engine that lets developers define and execute multi-step workflows, persist execution state, retry failed steps, and recover after worker restarts.

> Status: Phase 0 (project setup) complete / pre-MVP  
> Primary goal: Demonstrate backend engineering depth: durable state, concurrency, idempotency, retries, failure recovery, testing, observability, and deployment.

## Local development

Prerequisites: Node.js 24 LTS (see `.nvmrc`), pnpm 11 (`corepack enable`), a [Neon](https://neon.tech) PostgreSQL database.

```sh
pnpm install
cp .env.example .env   # then set DATABASE_URL to your Neon connection string
pnpm dev               # API on http://localhost:3000
curl localhost:3000/health   # {"status":"ok"}  process is up
curl localhost:3000/ready    # {"status":"ok"}  database reachable (503 if not)
```

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `pnpm lint`         | ESLint (type-aware)                                        |
| `pnpm format:check` | Prettier check (`pnpm format` to fix)                      |
| `pnpm typecheck`    | `tsc --noEmit` in every package                            |
| `pnpm test`         | Vitest; real-database tests run only if `DATABASE_URL` set |
| `pnpm build`        | Build every package                                        |

CI (`.github/workflows/ci.yml`) runs install, dependency audit (high+), format check, lint, type-check, tests and build on every push to `main` and every pull request. Add a `DATABASE_URL` repository secret (ideally a dedicated Neon branch) to also run the real-database tests in CI.

### Layout

```text
apps/api/   NestJS HTTP API (versioned routes under /api/v1; /health and /ready outside it)
docs/       Product, architecture, engineering and planning docs
```

The worker and shared `packages/*` arrive in later phases (see `docs/planning/ROADMAP.md`).

## Product boundary

FlowForge is an educational, single-tenant-first orchestration engine. It is not a Temporal replacement and must not claim exactly-once execution across arbitrary external services.

## Initial technology decisions

- Core API and worker: TypeScript + NestJS
- Durable source of truth: PostgreSQL (hosted on Neon, see ADR-002)
- Initial task coordination: PostgreSQL-backed task claiming; introduce Redis only for a justified use case
- Frontend: Next.js + TypeScript
- Local environment: Node.js + hosted Neon database (no Docker required)
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
10. `docs/architecture/ADR-002-neon-postgres.md`

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
