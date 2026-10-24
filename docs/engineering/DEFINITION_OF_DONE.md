# Definition of Done

A feature is done only when all applicable items are true.

## Requirements

- [ ] User story and acceptance criteria are clear.
- [ ] Non-goals and failure behavior are understood.
- [ ] API contract is documented where relevant.

## Implementation

- [ ] Code follows the module boundaries.
- [ ] Input is validated.
- [ ] State changes are explicit and atomic where required.
- [ ] Error handling is deliberate; no swallowed exceptions.
- [ ] Sensitive data is not logged.
- [ ] Configuration and secrets are externalized.

## Quality

- [ ] Unit tests cover domain behavior.
- [ ] Integration tests cover persistence/concurrency where relevant.
- [ ] Failure paths are tested, not just happy paths.
- [ ] Lint, formatting, type-check and test commands pass.
- [ ] No known critical security issue is introduced.

## Operations

- [ ] Structured logs include useful correlation identifiers.
- [ ] Health/readiness behavior is appropriate.
- [ ] Database migrations are included.
- [ ] Local setup documentation is current.

## Documentation

- [ ] README or relevant docs are updated.
- [ ] Architectural trade-offs or new decisions are recorded.
- [ ] Limitations and guarantees are stated honestly.

## Release

- [ ] CI passes.
- [ ] Deployment and rollback steps are documented when relevant.
- [ ] Demo evidence is captured for user-visible or reliability features.
