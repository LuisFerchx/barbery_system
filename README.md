<div align="center">

  <img src="github_banner.png" alt="Hair Craft Banner" width="100%">

# Hair Craft Barbershop Management System

  **Comprehensive barbershop management — sales, appointments, inventory, accounting, and more**

  ![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

## Modules

| Module | Description |
|--------|-------------|
| **Sales** | Service registration, automatic commissions, export, **sales editing with inventory adjustment**, and **automatic creation upon appointment confirmation** |
| **Appointments** | Scheduling with Month / Scrollable Week / 3-Day / Day / Daily Agenda views, **overlapping appointment layout algorithm (side-by-side)**, and conflict validation |
| **Public Bookings** | No-login scheduling wizard (Fresha style): selection of barber, service, date and time; confirmation code |
| **Barbers** | Staff management, profile photo, commissions, and **Barber Hours Block (with recurrences and exceptions)** |
| **Business** | Schedules, operating days, commission per service, and logo configuration |
| **Clients** | History, retention metrics, new vs. returning clients |
| **Inventory** | Stock control, minimum stock alerts, automatic courtesy drinks |
| **Cash Register** | Register closures, adjustments, cash summary by period |
| **Accounting** | Dashboard with income split: profit, owner salary, taxes, and operations |
| **Configuration** | Service/product catalog, payment methods, income split |
| **Security** | Roles (superadmin / admin / manager / barber), JWT with refresh tokens |

---

## Technologies

| Backend | Frontend | Infrastructure |
|---------|----------|-------|
| FastAPI 0.115 | React 18 + TypeScript | PostgreSQL 17 (external) |
| SQLAlchemy 2 | Vite + Tailwind CSS | Docker + Docker Compose |
| Alembic | Recharts / date-fns | Nginx (reverse proxy) |
| Pydantic v2 | Lucide React | JWT (access + refresh) |
| supabase-py 2 | — | Supabase Storage (images) |

---

## Deployment Architecture

```
Browser
  └── Main Nginx (port 80)
        └── location /barberia/  →  Frontend container (8002)
              ├── /              →  SPA (React)
              └── /api/          →  Backend container (8001)
                    └── FastAPI  →  PostgreSQL (external)
                                 →  Supabase Storage (photos/logos)
```

The app lives under the `/barberia/` sub-path. The main Nginx must have:

```nginx
location /barberia/ {
    proxy_pass         http://localhost:8002/;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

> The trailing slash in `proxy_pass` is critical — it strips the `/barberia` prefix before reaching the container.

---

## Installation

### 1. Clone

```bash
git clone https://github.com/LuisFerchx/barbery_system.git
cd barbery_system
```

### 2. Configure Environment Variables

Edit `backend/.env` (copy from `backend/.env.example`):

```env
DATABASE_URL=postgresql://postgres:PASSWORD@host.docker.internal:5433/barberia
SECRET_KEY=generate_with_openssl_rand_hex_32
CORS_ORIGINS=["http://your-domain.com"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase Storage (barber photos and company logo)
SUPABASE_URL=https://<project-id>.supabase.co/rest/v1/
SUPABASE_KEY=<service-role-key>
SUPABASE_BUCKET=barbery-files
```

> If PostgreSQL runs on the same machine as Docker (Linux), add to `docker-compose.yml` under `backend`:
> ```yaml
> extra_hosts:
>   - "host.docker.internal:host-gateway"
> ```
> and use the port exposed on the host (not the container's internal port).

### 3. Configure Supabase Bucket

1. Create a `barbery-files` bucket in the Supabase Dashboard → Storage.
2. Enable public access to the bucket.

### 4. Create the Database

```bash
docker exec <postgres-container> psql -U postgres -c "CREATE DATABASE barberia;"
```

### 5. Start Containers

```bash
docker compose up -d --build
```

Alembic migrations run automatically when the backend starts.

### 6. Initial Seed (first time only)

```bash
docker compose exec backend python seed.py
```

### 7. Access

| Service | URL |
|----------|-----|
| App | `http://your-server/barberia/` |
| Public bookings | `http://your-server/barberia/agendar/<slug>` |
| API Docs | `http://your-server:8001/docs` |

#### Default Credentials

| User | Password | Role |
|---------|------------|-----|
| `superadmin` | `superadmin123` | Global (no company) |
| `admin` | `admin123` | Main company admin |

> Change passwords after the first login.

---

## Local Development

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm run dev        # http://localhost:5173/barberia/

# Migrations
cd backend
alembic upgrade head
alembic revision --autogenerate -m "description"
```

---

## Structure

```
barbery_system/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI routes by domain
│   │   ├── crud/               # Business logic and DB
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── utils/
│   │   │   └── supabase.py     # Supabase client + public image URL
│   │   ├── config.py           # Environment variables (pydantic-settings)
│   │   ├── database.py         # Engine + get_db()
│   │   └── security.py         # JWT, hash, auth dependencies
│   ├── migrations/             # Alembic migrations
│   ├── tests/
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # One page per route
│   │   ├── components/
│   │   │   ├── booking/        # Public booking wizard (5 steps)
│   │   │   ├── citas/          # Appointment calendar components
│   │   │   ├── layout/         # Layout, Sidebar, Header
│   │   │   └── ui/             # Table, Modal, StatCard
│   │   ├── services/
│   │   │   ├── api.ts          # Domain axios wrappers (authenticated)
│   │   │   └── publicApi.ts    # Public API for no-login bookings
│   │   ├── types/index.ts      # TypeScript interfaces
│   │   └── context/            # AuthContext
│   ├── nginx.conf              # Frontend container Nginx
│   └── Dockerfile
├── docker-compose.yml
│   └── CLAUDE.md
```

---

## API — Featured Endpoints

| Method | Route | Description |
|--------|------|-------------|
| `PUT` | `/api/v1/sales/{id}` | Edit sale (modifies courtesy drink stock, commissions, and accounting) |
| `GET` | `/api/v1/barbers/{barber_id}/hours/` | List a barber's schedules and blocks |
| `POST` | `/api/v1/barbers/{barber_id}/hours/` | Create a schedule/block for a barber |
| `PUT` | `/api/v1/barbers/hours/{hours_id}/` | Update a schedule/block |
| `DELETE` | `/api/v1/barbers/hours/{hours_id}/` | Delete a schedule/block |
| `POST` | `/api/v1/barbers/{id}/photo` | Upload barber profile photo |
| `POST` | `/api/v1/companies/me/logo` | Upload company logo |
| `GET` | `/api/v1/public/{slug}` | Public info of the barbershop |
| `GET` | `/api/v1/public/{slug}/barbers` | Active barbers (with photo) |
| `GET` | `/api/v1/public/{slug}/services` | Available services |
| `GET` | `/api/v1/public/{slug}/slots` | Available slots by barber/date |
| `POST` | `/api/v1/public/{slug}/book` | Create booking (atomic transaction) |
| `GET` | `/api/v1/public/appointment/{code}` | Consult booking by code |
