# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Barbershop management system for "Hair Craft". FastAPI backend + React 18 + TypeScript frontend, deployed via Docker behind Nginx at the `/barberia/` sub-path.

## Commands

### Backend

```bash
cd backend
source venv/bin/activate

# Dev server
uvicorn app.main:app --reload --port 8001

# Run all tests
pytest

# Run a single test file
pytest tests/test_sales.py

# Run a specific test
pytest tests/test_sales.py::test_create_sale

# DB migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Seed database
python seed.py
```

### Frontend

```bash
cd frontend

npm run dev       # dev server (port 5173)
npm run build     # tsc + vite build
npm run lint      # eslint
```

### Docker

```bash
docker-compose up -d --build
docker-compose logs -f backend
```

## Architecture

### Deployment topology

Nginx proxies `/barberia/` → frontend container (port 8002). The frontend container (Nginx) serves static assets and proxies API calls internally to backend (port 8001). This means:
- `BrowserRouter` has `basename="/barberia"`
- `VITE_API_BASE_URL` defaults to `/barberia/api/v1`
- All API routes must have a trailing slash (e.g., `/sales/`) — the Nginx rewrite strips the `/barberia` prefix before hitting the backend

### Backend layers

```
app/
├── config.py        — pydantic-settings; reads .env
├── database.py      — SQLAlchemy engine + get_db() dependency
├── security.py      — JWT encode/decode, get_current_user, require_admin
├── models/          — SQLAlchemy ORM models (registered in models/__init__.py)
├── schemas/         — Pydantic request/response schemas
├── crud/            — DB logic (no HTTP concerns)
└── api/v1/
    ├── router.py    — mounts all endpoint routers
    └── endpoints/   — FastAPI route handlers
```

### Key business logic

**Sale creation** (`crud/sale.py`): when a sale is created, commission and income splits are calculated automatically from `IncomeSplitConfig` (stored in DB, editable via `/config/split`). Fields `barber_commission_amount`, `real_income`, `split_profit`, `split_owner_salary`, `split_taxes`, `split_operating` are derived — never passed from the client. If `courtesy_drink_given=true`, one unit is auto-deducted from the lowest-stock `category="courtesy"` inventory item.

**Income split config**: percentages for `profit`, `owner_salary`, `taxes`, `operating` are rows in `income_split_config` table. They must sum to 1.0 and are applied to `real_income` (gross minus barber commission).

**Auth flow**: JWT access + refresh tokens stored in `localStorage`. The axios interceptor in `api.ts` auto-refreshes on 401. Backend deps: `get_current_user` for any authenticated route, `require_admin` for admin/manager-only routes (roles: `admin`, `manager`, `barber`).

### Frontend structure

```
src/
├── App.tsx           — router (basename="/barberia"), PrivateRoute guard
├── context/
│   └── AuthContext.tsx — user state, login/logout, token storage
├── services/api.ts   — axios instance + typed API wrappers per domain
├── types/index.ts    — shared TypeScript interfaces
├── pages/            — one file per route
├── components/
│   ├── layout/       — Layout, Sidebar, Header
│   └── ui/           — Table, Modal, StatCard
└── utils/format.ts   — currency/date formatters
```

All API calls go through the named exports in `services/api.ts` (e.g., `salesApi`, `barbersApi`). Pages do not call `axios` directly.

### Database

- **Dev**: SQLite at `backend/barberia.db` (committed, used by Docker too)
- **Prod**: PostgreSQL via `DATABASE_URL` env var
- `Base.metadata.create_all()` runs on startup as dev fallback; Alembic is authoritative for schema changes
- Migrations live in `backend/migrations/`

### Environment variables

Backend reads from `backend/.env`:
```
DATABASE_URL=sqlite:///./barberia.db
SECRET_KEY=<required in prod>
CORS_ORIGINS=["http://localhost:5173"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Frontend reads from `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8001/api/v1   # local dev only
```

In Docker/prod `VITE_API_BASE_URL` is not set — the default `/barberia/api/v1` is used.

### Tests

Tests use in-memory SQLite. `conftest.py` overrides `get_db` and `get_current_user` via `app.dependency_overrides`. Auth is always bypassed as an admin user — no token setup needed.
