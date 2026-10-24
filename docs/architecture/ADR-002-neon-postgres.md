# ADR-002: Neon PostgreSQL Instead of Local Docker Compose

- **Status:** Accepted
- **Date:** 2026-10-24
- **Supersedes:** the "Docker Compose for local development" database part of ADR-001

## Context

ADR-001 planned a Docker Compose PostgreSQL for local development. The project owner prefers a hosted database so that local setup, CI and the later deployed demo all use the same kind of PostgreSQL, without running Docker locally.

## Decision

- Use [Neon](https://neon.tech) serverless PostgreSQL, configured only through `DATABASE_URL`.
- Connect with `node-postgres` (`pg`) over TCP, not Neon's HTTP/WebSocket serverless driver. The API and worker are long-lived processes and later phases need interactive transactions and `SELECT ... FOR UPDATE SKIP LOCKED`.
- Use the direct (non-pooler) endpoint for now. PgBouncer transaction pooling can break session-level features; revisit when connection count matters.
- Use `sslmode=verify-full`.
- `/health` reports process liveness only; `/ready` checks the database.

## Consequences

- No Docker requirement for local development; a Neon project (free tier is enough) is required instead.
- Neon suspends idle compute and closes connections. The pool handles idle-client errors without crashing, and the first query after suspension can be slower (connection timeout is bounded at 5s).
- Tests that need a real database run only when `DATABASE_URL` is set. CI runs them if a `DATABASE_URL` repository secret is configured; a dedicated Neon branch keeps CI data isolated from development data.
- Integration tests in later phases must create and clean up their own data (or use a throwaway Neon branch), since there is no disposable local container.
