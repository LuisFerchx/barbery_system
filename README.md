<div align="center">

  # Sistema de Gestión Barbería Hair Craft

  **Gestión integral de barberías — ventas, citas, inventario, contabilidad y más**

  ![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| **Ventas** | Registro de servicios, comisiones automáticas, exportación a Excel/PDF |
| **Citas** | Agendamiento con vistas Mes / Semana / Día / Agenda, validación de conflictos |
| **Barberos** | Gestión de colaboradores, comisiones por servicio o porcentaje |
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

---

## Arquitectura de despliegue

```
Browser
  └── Nginx principal (puerto 80)
        └── location /barberia/  →  Frontend container (8002)
              ├── /              →  SPA (React)
              └── /api/          →  Backend container (8001)
                    └── FastAPI  →  PostgreSQL (externo)
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

Editar `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@host.docker.internal:5433/barberia
SECRET_KEY=genera_con_openssl_rand_hex_32
CORS_ORIGINS=["http://tu-dominio.com"]
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
```

> Si PostgreSQL corre en la misma máquina que Docker (Linux), agrega a `docker-compose.yml` bajo `backend`:
> ```yaml
> extra_hosts:
>   - "host.docker.internal:host-gateway"
> ```
> y usa el puerto expuesto en el host (no el interno del contenedor).

### 3. Crear la base de datos

```bash
docker exec <postgres-container> psql -U postgres -c "CREATE DATABASE barberia;"
```

### 4. Levantar contenedores

```bash
docker compose up -d --build
```

Las migraciones de Alembic corren automáticamente al iniciar el backend.

### 5. Seed inicial (solo la primera vez)

```bash
docker compose exec backend python seed.py
```

### 6. Acceso

| Servicio | URL |
|----------|-----|
| App | `http://tu-servidor/barberia/` |
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
│   │   ├── components/         # Layout, UI, módulos
│   │   ├── services/api.ts     # Wrappers axios por dominio
│   │   ├── types/index.ts      # Interfaces TypeScript
│   │   └── context/            # AuthContext
│   ├── nginx.conf              # Nginx del contenedor frontend
│   └── Dockerfile
├── docker-compose.yml
└── CLAUDE.md
```
