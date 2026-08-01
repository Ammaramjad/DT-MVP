# API Endpoints (v1)

Base path: `/v1`

Authentication model in this foundation uses `X-User-Id` header for deterministic local testing.
Production deployment should enforce Clerk JWT verification middleware.

## Health

- `GET /health`

## Projects

- `POST /projects`
  - body: `name`, `description`, `tags[]`
- `GET /projects`
- `GET /projects/{project_id}`

## Papers

- `POST /papers/upload`
  - multipart: `project_id`, `file`
  - Performs extraction + storage + vector indexing
- `POST /papers/summarize`
  - body: `paper_id`, `level` (`beginner|standard|professor`)

## Intelligence

- `POST /intelligence/gap-finder`
  - body: `paper_ids[]`, `research_topic`
- `POST /intelligence/reviewer-simulator`
  - body: `manuscript`, `venue`
- `POST /intelligence/paper-score`
  - body: `manuscript`

## Planned Endpoints by Module

- Citation manager: format conversion + BibTeX/RIS export
- Experiment planner: plan generation + task instantiation
- Academic writer: section-specific generation and revision engine
- Journal/conference recommendation: retrieval + ranking models
- Admin panel: billing, usage, user moderation, support workflows
