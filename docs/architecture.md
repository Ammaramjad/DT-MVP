# System Architecture

## High-Level Architecture Diagram

```mermaid
flowchart LR
  U[Researcher / Team] --> W[Next.js Web App]
  W --> C[Clerk Auth]
  W --> API[FastAPI API Gateway]
  API --> PG[(PostgreSQL)]
  API --> R[(Redis Cache/Rate Limit)]
  API --> S3[(S3-Compatible Object Storage)]
  API --> Q[(Qdrant Vector DB)]
  API --> X1[CrossRef]
  API --> X2[Semantic Scholar]
  API --> X3[OpenAlex]
  API --> OAI[OpenAI]
  API --> ANT[Anthropic]
  API --> GEM[Gemini]
  API --> DS[DeepSeek]
  API --> A[Audit Log Pipeline]
```

## Component Responsibilities

- **Frontend (Next.js)**: project workspace, AI module UX, dashboard analytics, settings/billing views.
- **API (FastAPI)**: auth checks, project CRUD, PDF ingestion, RAG retrieval, AI orchestration.
- **PostgreSQL**: canonical transactional data.
- **Redis**: request throttling, hot response cache, session helpers.
- **Qdrant**: semantic retrieval over paper chunks.
- **S3-compatible storage**: raw PDF storage + generated artifacts.
- **AI Router**: provider selection/fallback for reliability and cost control.

## RAG Pipeline

1. Upload PDF.
2. Extract text with PyMuPDF; OCR fallback via Tesseract.
3. Chunk text into semantically coherent spans.
4. Generate embeddings (`text-embedding-3-small`).
5. Upsert vectors into Qdrant with paper/project metadata.
6. At query time, retrieve top-k chunks and ground generation.

## Multi-Tenant Security Model

- Every domain object resolves through authenticated user ownership.
- Team workspace support is added via organization scopes.
- Audit logs are stored for high-risk actions.
- Data is encrypted in transit (TLS) and at rest (managed cloud KMS).

## ER Diagram

```mermaid
erDiagram
  USERS ||--o{ PROJECTS : owns
  USERS ||--o{ SUBSCRIPTIONS : has
  PROJECTS ||--o{ PAPERS : contains
  PROJECTS ||--o{ RESEARCH_TASKS : tracks
  PAPERS ||--o{ PAPER_ANNOTATIONS : has
  PAPERS ||--o{ CITATIONS : renders
  PROJECTS ||--o{ CHAT_SESSIONS : enables
  CHAT_SESSIONS ||--o{ CHAT_MESSAGES : stores
  USERS ||--o{ AUDIT_LOGS : creates

  USERS {
    uuid id
    string clerk_user_id
    string email
    string full_name
    datetime created_at
  }
  PROJECTS {
    uuid id
    uuid owner_id
    string name
    json tags
    json milestones
    datetime created_at
  }
  PAPERS {
    uuid id
    uuid project_id
    string title
    string doi
    text abstract
    json metadata
    string storage_key
  }
  CITATIONS {
    uuid id
    uuid paper_id
    string style
    text content
  }
```
