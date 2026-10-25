# ADR-003: Kysely, SQL Migrations, zod and Module Layout

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

Phase 1 needs a way to define the schema, query PostgreSQL, validate untrusted input and keep domain rules independent of NestJS. Later phases depend on precise SQL: `SELECT ... FOR UPDATE SKIP LOCKED` for task claiming, short explicit transactions, and lease updates guarded by conditions.

## Decisions

1. **Kysely as the query builder** (over Prisma, Drizzle, TypeORM). Queries stay close to SQL, transactions and row locks are explicit, and types come from a small hand-written schema interface (`src/db/schema.ts`). No code generation step.
2. **Plain `.sql` migrations** in `apps/api/migrations/`, applied in filename order by Kysely's `Migrator` (`pnpm db:migrate`). On PostgreSQL it takes a session advisory lock and runs pending migrations in one transaction, so concurrent runs are safe and a failed migration leaves nothing half-applied. Forward-only: mistakes are fixed by a new migration.
3. **Foreign keys and database constraints** for integrity (unique names, unique versions, positive version numbers, immutable versions via trigger), as `DATA_MODEL.md` requires. Constraint names are stable because the API maps violations to error codes.
4. **zod for validation**, shared by the domain (definition and retry policy rules) and the HTTP layer (bodies, params, query). The same schemas can later produce JSON Schema for OpenAPI.
5. **Domain rules in `apps/api/src/domain/`**, with an ESLint rule forbidding imports of Nest, Express, pg, Kysely or other layers. A separate `packages/domain` is deferred until the worker exists and needs it; moving a dependency-free folder is cheap.
6. **No service layer for now.** Controllers validate input and call the repository; domain rules live in `src/domain`. A service is added when an operation coordinates more than one repository or applies a state transition.

## Consequences

- Schema changes require a migration and a matching edit to `src/db/schema.ts`; repository integration tests catch mismatches.
- Migrations need the direct (non-pooler) Neon endpoint, because the advisory lock is session-scoped (consistent with ADR-002).
- No down migrations: rolling back means deploying a forward fix.
- OpenAPI generation is not in place yet; `API_CONTRACT.md` documents the implemented behavior until it is.
