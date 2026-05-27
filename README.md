<div align="center">

# Sistema de Gestión Barbería Hair Craft

  **Gestión integral de barberías — ventas, citas, inventario, contabilidad y más**

  ![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Ventas** | Registro de servicios, comisiones automáticas, exportación a Excel/PDF |
| **Citas** | Agendamiento con vistas Mes / Semana / Día / Agenda, validación de conflictos |
| **Reservas públicas** | Wizard de agendamiento sin login (estilo Fresha): selección de barbero, servicio, fecha y hora; código de confirmación |
| **Barberos** | Gestión de colaboradores, comisiones por servicio o porcentaje, foto de perfil |
| **Empresa** | Configuración de horarios, días operativos, comisión por servicio, logo |
| **Clientes** | Historial, métricas de retención, nueva visita vs. retorno |
| **Inventario** | Control de stock, alertas de mínimo, bebidas de cortesía automáticas |
| **Caja** | Cierres de caja, ajustes, resumen de efectivo por período |
| **Contabilidad** | Dashboard con split de ingresos: utilidad, salario dueño, impuestos, operación |
| **Configuración** | Catálogo de servicios/productos, métodos de pago, split de ingresos |
| **Seguridad** | Roles (superadmin / admin / manager / barber), JWT con refresh tokens |

---

## Tecnologías

| Backend | Frontend | Infra |
|---------|----------|-------|
| FastAPI 0.115 | React 18 + TypeScript | PostgreSQL 17 (externo) |
| SQLAlchemy 2 | Vite + Tailwind CSS | Docker + Docker Compose |
| Alembic | Recharts / date-fns | Nginx (reverse proxy) |
| Pydantic v2 | Lucide React | JWT (access + refresh) |
| supabase-py 2 | — | Supabase Storage (imágenes) |

---

## Arquitectura de despliegue

```
Browser
  └── Nginx principal (puerto 80)
        └── location /barberia/  →  Frontend container (8002)
              ├── /              →  SPA (React)
              └── /api/          →  Backend container (8001)
                    └── FastAPI  →  PostgreSQL (externo)
                                 →  Supabase Storage (fotos/logos)
```

La app vive en el sub-path `/barberia/`. El Nginx principal debe tener:

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

> La barra final en `proxy_pass` es crítica — stripea el prefijo `/barberia` antes de llegar al contenedor.

---

## Instalación

### 1. Clonar

```bash
git clone https://github.com/LuisFerchx/barbery_system.git
cd barbery_system
```

### 2. Configurar variables de entorno

Editar `backend/.env` (copiar desde `backend/.env.example`):

```env
DATABASE_URL=postgresql://postgres:PASSWORD@host.docker.internal:5433/barberia
SECRET_KEY=genera_con_openssl_rand_hex_32
CORS_ORIGINS=["http://tu-dominio.com"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Supabase Storage (fotos de barberos y logo de empresa)
SUPABASE_URL=https://<project-id>.supabase.co/rest/v1/
SUPABASE_KEY=<service-role-key>
SUPABASE_BUCKET=barbery-files
```

> Si PostgreSQL corre en la misma máquina que Docker (Linux), agrega a `docker-compose.yml` bajo `backend`:
> ```yaml
> extra_hosts:
>   - "host.docker.internal:host-gateway"
> ```
> y usa el puerto expuesto en el host (no el interno del contenedor).

### 3. Configurar bucket en Supabase

1. Crear bucket `barbery-files` en el dashboard de Supabase → Storage
2. Habilitar acceso público al bucket

### 4. Crear la base de datos

```bash
docker exec <postgres-container> psql -U postgres -c "CREATE DATABASE barberia;"
```

### 5. Levantar contenedores

```bash
docker compose up -d --build
```

Las migraciones de Alembic corren automáticamente al iniciar el backend.

### 6. Seed inicial (solo la primera vez)

```bash
docker compose exec backend python seed.py
```

### 7. Acceso

| Servicio | URL |
|----------|-----|
| App | `http://tu-servidor/barberia/` |
| Reservas públicas | `http://tu-servidor/barberia/agendar/<slug>` |
| API Docs | `http://tu-servidor:8001/docs` |

#### Credenciales por defecto

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `superadmin` | `superadmin123` | Global (sin empresa) |
| `admin` | `admin123` | Administrador empresa principal |

> Cambiar contraseñas después del primer login.

---

## Desarrollo local

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm run dev        # http://localhost:5173/barberia/

# Migraciones
cd backend
alembic upgrade head
alembic revision --autogenerate -m "descripcion"
```

---

## Estructura

```
barbery_system/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Rutas FastAPI por dominio
│   │   ├── crud/               # Lógica de negocio y DB
│   │   ├── models/             # Modelos SQLAlchemy
│   │   ├── schemas/            # Schemas Pydantic
│   │   ├── utils/
│   │   │   └── supabase.py     # Cliente Supabase + URL pública de imágenes
│   │   ├── config.py           # Variables de entorno (pydantic-settings)
│   │   ├── database.py         # Engine + get_db()
│   │   └── security.py         # JWT, hash, dependencias de auth
│   ├── migrations/             # Migraciones Alembic
│   ├── tests/
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # Una página por ruta
│   │   ├── components/
│   │   │   ├── booking/        # Wizard de reserva pública (5 pasos)
│   │   │   ├── citas/          # Componentes del calendario de citas
│   │   │   ├── layout/         # Layout, Sidebar, Header
│   │   │   └── ui/             # Table, Modal, StatCard
│   │   ├── services/
│   │   │   ├── api.ts          # Wrappers axios por dominio (autenticado)
│   │   │   └── publicApi.ts    # API pública para reservas sin login
│   │   ├── types/index.ts      # Interfaces TypeScript
│   │   └── context/            # AuthContext
│   ├── nginx.conf              # Nginx del contenedor frontend
│   └── Dockerfile
├── docker-compose.yml
└── CLAUDE.md
```

---

## API — endpoints destacados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/barbers/{id}/photo` | Subir foto de perfil del barbero |
| `POST` | `/api/v1/companies/me/logo` | Subir logo de la empresa |
| `GET` | `/api/v1/public/{slug}` | Info pública de la barbería |
| `GET` | `/api/v1/public/{slug}/barbers` | Barberos activos (con foto) |
| `GET` | `/api/v1/public/{slug}/services` | Servicios disponibles |
| `GET` | `/api/v1/public/{slug}/slots` | Slots disponibles por barbero/fecha |
| `POST` | `/api/v1/public/{slug}/book` | Crear reserva (transacción atómica) |
| `GET` | `/api/v1/public/appointment/{code}` | Consultar reserva por código |
