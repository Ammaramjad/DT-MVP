# Installation Guide

## Prerequisites
- Docker + Docker Compose
- 8GB+ RAM

## Setup

1. Clone repository.
2. Copy env files:
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env.local`
3. Start services:
   - `docker compose up --build`

## First API Call

```bash
curl -X GET http://localhost:8000/v1/health
```

## Create a Project

```bash
curl -X POST http://localhost:8000/v1/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user-1" \
  -d '{"name":"My Research Project","description":"Multi-agent systems","tags":["ai","ml"]}'
```
