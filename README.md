# Research Copilot

**Tagline:** _Your AI Research Assistant from Idea to Publication._

Research Copilot is a production-oriented SaaS platform for the complete research lifecycle: discovery, reading, gap analysis, planning, writing, review, and submission strategy.

This repository contains a scalable monorepo foundation with:

- **Web app:** Next.js 15 + TypeScript + Tailwind + shadcn/ui patterns
- **API:** FastAPI + SQLAlchemy + Redis + Qdrant + S3-compatible storage
- **Data:** PostgreSQL
- **Infra:** Docker Compose for local and cloud parity
- **AI orchestration:** multi-provider adapters (OpenAI, Anthropic, Gemini, DeepSeek)

---

## Monorepo Structure

```text
apps/
  api/                  FastAPI backend
  web/                  Next.js frontend
docs/
  architecture.md       System architecture and ER diagram
  prd.md                Product requirements document
  api.md                API contract
  deployment.md         Deployment guide
  cicd.md               CI/CD guide
  roadmap.md            Phased build roadmap
  investor-pitch.md     Investor narrative
  marketing-seo.md      GTM + SEO strategy
  launch-checklist.md   Release readiness checklist
docker-compose.yml      Local full stack
```

---

## Quick Start

### 1) Environment

Copy both API and web environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 2) Start all services

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Qdrant: `http://localhost:6333/dashboard`
- MinIO: `http://localhost:9001`

---

## Production Principles

- Multi-tenant by design with row ownership and server-side auth checks
- Stateless API processes with Redis-backed throttling + caching
- Provider abstraction layer for AI model portability and failover
- Retrieval-augmented generation with source-grounded responses
- Audit logs for security-sensitive operations
- Strict input validation and typed API contracts

---

## Pricing Tiers

- **Starter:** $20/month
- **Pro:** $35/month
- **Team:** $50/user/month
- **Enterprise:** Custom

---

## Current Delivery State

This branch ships the **enterprise-grade foundation (Phase 1)**:

- Auth-ready API skeleton with Clerk token verification hooks
- Core domain schema for projects, PDFs, tasks, citations, chat history, subscriptions
- PDF ingestion and extraction pipeline (PyMuPDF + OCR fallback)
- AI summarization + reviewer simulation + scoring + gap finder service contracts
- Next.js dashboard and workspace UX foundation
- Full architecture, PRD, API, deployment, and GTM documentation

Subsequent phases scale module depth and model quality without architectural rewrites.
