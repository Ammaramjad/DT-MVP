# CI/CD Guide

## Pipeline Stages

1. Lint + type checks (web + api)
2. Unit tests
3. Build Docker images
4. Security scanning (dependency + container)
5. Deploy to staging
6. Smoke tests
7. Promote to production

## Branching

- `main` is protected and always deployable.
- Feature branches create preview environments.
- Production deploys are tagged releases.

## Quality Gates

- API test pass rate 100%
- Critical vulnerability count = 0
- Migration compatibility check passes
- OpenAPI schema validation passes
