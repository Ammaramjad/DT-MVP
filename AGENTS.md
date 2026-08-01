# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **AI Digital Twin SaaS platform (DT-MVP)** — a monorepo with three
services plus PostgreSQL/TimescaleDB and Redis. Note the full product lives on the
`copilot/build-ai-digital-twin-platform` branch (the `main` branch only has a README).

### Services and ports

| Service | Path | Port | Dev run command (from the service dir) |
|---------|------|------|----------------------------------------|
| Backend API (FastAPI) | `backend/` | 8000 | `./venv/bin/uvicorn app.main:app --reload --port 8000` |
| ML service (FastAPI + Prophet) | `ml-service/` | 8001 | `DEBUG=true ./venv/bin/uvicorn app.main:app --reload --port 8001` |
| Frontend (React 19 + Vite 7) | `frontend/` | 3000 | `npm run dev` (Vite is configured to port 3000, not 5173) |

Standard per-service commands (venv setup, migrations, seed, tests) are documented in
`README.md` and `docs/DEVELOPMENT.md`; the notes below only capture non-obvious things.

### Runtime / dependency notes (non-obvious)

- **Python 3.11 is required** (not the system 3.12). The virtualenvs are created with
  `python3.11` and live at `backend/venv` and `ml-service/venv`. The update script
  recreates them and installs dependencies, so you normally don't need to.
- `backend/.env` and `frontend/.env` are git-ignored and created during setup. Because
  the pinned `pydantic-settings` JSON-decodes list-typed env vars, `CORS_ORIGINS` in
  `backend/.env` must be a **JSON array** (e.g. `["http://localhost:3000",...]`), not a
  comma-separated string.
- `backend/.env` points `DATABASE_URL` / `REDIS_URL` at `localhost` (the compose file
  uses docker hostnames like `postgres`/`redis`, which don't apply to local dev).

### PostgreSQL + TimescaleDB and Redis (must be running for the backend)

These are installed at the system level but are **not started automatically** on a fresh
VM. Start them (idempotent) before running the backend/migrations/seed:

```
sudo pg_ctlcluster 16 main start
sudo service redis-server start
```

Local DB: database `digital_twin`, superuser role `dtuser` / password
`changeme_in_production` on `localhost:5432`. The schema requires the TimescaleDB
extension (the `manufacturing_data`, `energy_data`, `retail_data` tables are hypertables).
Apply migrations and seed demo data (from `backend/`, with the venv):

```
./venv/bin/alembic upgrade head
./venv/bin/python scripts/seed_data.py --clear
```

Seeded login: `admin.user@acme-manufacturing.com` / `password123`.

### Lint / test / build

- Backend lint: `backend/venv/bin/flake8 app tests` (CI's blocking check is the
  `--select=E9,F63,F7,F82` subset).
- Backend tests: `backend/venv/bin/pytest`. NOTE: the suite does **not** pass as-is —
  `tests/conftest.py` forces `sqlite:///:memory:` but the ORM models use PostgreSQL-only
  column types (`JSONB`, `UUID`) that SQLite cannot compile, and a few test modules import
  symbols that don't exist in the app. These are pre-existing test-code issues, not
  environment problems.
- Frontend lint: `npm run lint` (has 1 pre-existing error + several warnings). There is
  **no** `npm test` script; use `npm run build` (`tsc -b && vite build`) to validate.

### Known pre-existing app bugs (frontend ↔ backend contract mismatch)

The frontend and backend were never integrated, so the running UI cannot fully talk to
the backend. Keep this in mind before assuming a UI failure is an environment problem:

- Backend routers are **double-prefixed** (e.g. `/api/v1/auth/auth/login`,
  `/api/v1/orgs/orgs`, `/api/v1/projects/projects`, `/api/v1/kpis/kpis/...`) while the
  frontend calls single-prefixed REST paths (`/api/v1/auth/login`,
  `/api/v1/organizations/`, ...).
- Login differs: frontend posts form-encoded `username`; backend expects JSON `email`.
  There is no `/auth/me` endpoint the frontend expects.
- Several response schemas don't match their ORM models (e.g. `ProjectResponse`/register
  `UserResponse` expect `organization_id` while the model uses `org_id`), so those
  endpoints return 500 on serialization even though the DB write succeeds.

The backend itself is fully functional at its actual paths — e.g. login + the
`/api/v1/kpis/kpis/{vertical}/{site_id}` endpoints return real analytics computed over
the seeded TimescaleDB data, and the ML service `/api/v1/forecast/train` + `/predict`
endpoints work.
