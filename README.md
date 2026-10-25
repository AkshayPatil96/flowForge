# FlowForge

**Durable workflow orchestration for reliable multi-step jobs.**

FlowForge is a portfolio-grade workflow engine that lets developers define and execute multi-step workflows, persist execution state, retry failed steps, and recover after worker restarts.

> Status: Phase 1 (domain model + workflow definitions) complete / pre-MVP  
> Primary goal: Demonstrate backend engineering depth: durable state, concurrency, idempotency, retries, failure recovery, testing, observability, and deployment.

## Local development

Prerequisites: Node.js 24 LTS (see `.nvmrc`), pnpm 11 (`corepack enable`), a [Neon](https://neon.tech) PostgreSQL database.

```sh
pnpm install
cp .env.example .env   # then set DATABASE_URL to your Neon connection string
pnpm db:migrate        # apply SQL migrations (safe to re-run)
pnpm dev               # API on http://localhost:3000
curl localhost:3000/health   # {"status":"ok"}  process is up
curl localhost:3000/ready    # {"status":"ok"}  database reachable (503 if not)
```

Create and read a workflow:

```sh
curl -X POST localhost:3000/api/v1/workflows -H 'Content-Type: application/json' -d '{
  "name": "order-processing",
  "definition": { "steps": [
    { "key": "validate-order", "handler": "validateOrder" },
    { "key": "process-payment", "handler": "processPayment", "retryPolicy": { "maxAttempts": 5 } }
  ] }
}'
curl localhost:3000/api/v1/workflows
curl localhost:3000/api/v1/workflows/<id>/versions/1
```

See [API_CONTRACT.md](docs/architecture/API_CONTRACT.md) for every endpoint, rule and error code.

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `pnpm db:migrate`   | Apply pending `apps/api/migrations/*.sql`                  |
| `pnpm lint`         | ESLint (type-aware, plus domain-layer import boundaries)   |
| `pnpm format:check` | Prettier check (`pnpm format` to fix)                      |
| `pnpm typecheck`    | `tsc --noEmit` in every package                            |
| `pnpm test`         | Vitest; real-database tests run only if `DATABASE_URL` set |
| `pnpm build`        | Build every package                                        |

CI (`.github/workflows/ci.yml`) runs install, dependency audit (high+), format check, lint, type-check, tests and build on every push to `main` and every pull request. Real-database tests use the `DATABASE_URL` secret of the `CI` GitHub environment (a dedicated Neon branch); tests migrate it first and clean up their own rows.

### Layout

```text
apps/api/
  migrations/     SQL migrations (forward-only)
  src/domain/     State transitions, retry policy, definition rules (no framework imports)
  src/db/         Kysely database, schema types, migrator
  src/http/       Error format, request IDs, input validation
  src/workflows/  Workflow definition endpoints and repository
  test/           HTTP and database integration tests
docs/             Product, architecture (ADRs), engineering and planning docs
```

The worker arrives in Phase 3 (see `docs/planning/ROADMAP.md`).

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
11. `docs/architecture/ADR-003-persistence-and-validation.md`

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
