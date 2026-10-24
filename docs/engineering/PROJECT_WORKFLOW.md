# Project Workflow and Repository Hygiene

## Recommended repository structure

```text
flowforge/
  apps/
    api/                  # NestJS HTTP API
    worker/               # Worker entry point/process
    web/                  # Next.js dashboard (later)
  packages/
    domain/               # State machine, policies, types
    persistence/          # Database access and repositories
    config/               # Shared validated configuration
    test-utils/           # Test fixtures and fake handlers
  infra/
    docker/
    compose.yaml
  docs/
    product/
    architecture/
    engineering/
    planning/
  .github/
    workflows/
  .env.example
  .gitignore
  README.md
```

Do not force a monorepo tool on day one if it creates more setup work than value. A simple workspace is enough; adopt Turborepo/pnpm if the apps/packages genuinely benefit from it.

## Git workflow

- Keep `main` releasable.
- Use short-lived feature branches.
- Open small pull requests even when working solo; review your own diff.
- Each issue should have a clear acceptance criterion.
- Commit logical units of work.
- Never commit secrets, production data, or local database volumes.

Suggested branch naming:
- `feat/workflow-submission`
- `feat/worker-claiming`
- `test/worker-crash-recovery`
- `docs/architecture-decisions`

Suggested commit style:
- `feat: persist workflow executions`
- `test: cover duplicate idempotency submissions`
- `docs: clarify worker recovery semantics`

## Minimum package scripts

Adapt to chosen tooling:
- `lint`
- `format:check`
- `typecheck`
- `test`
- `test:integration`
- `db:migrate`
- `dev`
- `build`

## Environment variables

Provide names and safe examples in `.env.example`, not secrets:
- `DATABASE_URL`
- `API_PORT`
- `LOG_LEVEL`
- `WORKER_ID` (optional, otherwise generated)
- `WORKER_CONCURRENCY`
- `LEASE_DURATION_MS`
- `POLL_INTERVAL_MS`

Validate configuration at startup. Avoid silently accepting invalid values.

## Weekly review

At the end of each week:
1. What acceptance criterion became true?
2. Which failure scenario is still untested?
3. What complexity did you add without evidence it was needed?
4. What can be removed or deferred?
5. What can you demonstrate from a clean checkout?
