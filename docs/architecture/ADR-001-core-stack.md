# ADR-001: Core Stack and Initial Architecture

- **Status:** Accepted for MVP, revisit after measured evidence
- **Date:** 2026-10-24

## Context

The project owner already has JavaScript/TypeScript and full-stack experience and is learning Python. The project should demonstrate backend engineering depth without blocking progress on a new language or introducing unnecessary distributed deployment complexity.

## Decision

- Use TypeScript + NestJS for the initial orchestration API and worker.
- Use PostgreSQL as the durable source of truth.
- Start with database-backed task claiming and explicit state transitions.
- Use Next.js for the inspection dashboard after engine reliability tests pass.
- Use Docker Compose for local development. (Database superseded by ADR-002: Neon.)
- Add Redis only for a concrete requirement.
- Defer Kafka, Kubernetes, and a Python microservice until the core MVP passes its reliability gates.
- Learn Python alongside the project; add a separate Python service only when it has a bounded, testable responsibility.

## Alternatives considered

### Python + FastAPI for the entire engine

Pros:

- Builds practical Python backend skill immediately.
- Natural fit for future AI/data processing.
  Cons:
- Adds language learning to the hardest project concepts at the same time.
- May slow the first proof of durable execution.

### Java + Spring Boot

Pros:

- Strong option for enterprise backend roles.
  Cons:
- Requires a larger upfront language/framework learning investment than the current project timeline allows.

### TypeScript + NestJS

Pros:

- Leverages existing proficiency.
- Lets the project focus on correctness, transactions, recovery, testing, and operations.
  Cons:
- Does not by itself demonstrate Python backend capability; Python must be learned and evidenced separately.

## Consequences

- The first working engine can arrive sooner.
- Python learning remains an explicit parallel track.
- The system should keep domain logic modular enough that a future service can be introduced without rewriting the engine.
- Avoid a Python service solely to make the architecture look more complex.
