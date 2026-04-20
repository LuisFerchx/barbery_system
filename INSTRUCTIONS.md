# Sistema de Gestión para Barbería Hair Craft

## OBJETIVO
Aplicación fullstack para gestionar operaciones de una barbería. Stack: **FastAPI + React 18 + PostgreSQL + Docker**.

---

## ARQUITECTURA

**Backend**: FastAPI con SQLAlchemy ORM, JWT auth, Pydantic schemas
**Frontend**: React con TypeScript, React Hook Form, Recharts, Tailwind CSS
**BD**: PostgreSQL con Alembic migrations
**Config**: Variables en .env usando python-dotenv

---

## 8 MÓDULOS PRINCIPALES

### 1. VENTAS
- CRUD de ventas (cliente, barbero, servicio, producto, total, propina, transferencia bancaria)
- Filtros: fecha, barbero, cliente, monto
- Exportar Excel/PDF

**Modelo Sale**:
```
id, date, client_name, client_lastname, barber_id, service_id, service_value, 
product_id, product_value, total, tip, promotional_drink, bank_transfer, status, created_at
```

### 2. BARBEROS/COLABORADORES
- Crear/editar barberos con comisión por servicio
- Dashboard: clientes atendidos, ventas, comisiones, adelantos, saldo neto
- Transferencias bancarias por barbero
- Listado de deudas asociadas

**Modelos**: Barber, Commission, BankTransfer

### 3. SERVICIOS Y PRODUCTOS
- Servicios: Cabello ($9), Cabello+Barba ($16), Barba ($9), Depilación ($3.5), Filos ($4), Limpieza ($12), Permanente ($50+)
- Productos: Ceras, Minoxidil, Champúes, Fijadores, etc.
- CRUD con precios y comisiones

**Modelos**: Service, Product

### 4. INVENTARIO
- Stock de productos (inicial, abiertos, vendidos)
- Bebidas: Aguas, Colas, Power, Energizantes, Fuzeteá, Cervezas
- Alertas de stock bajo
- Historial de movimientos

**Modelos**: InventoryItem, InventoryMovement

### 5. CONTABILIDAD
- Dashboard: ingresos servicios, ingresos productos, transferencias, cash, gastos, utilidad neta
- Registro de gastos (toallas, bebidas, internet, luz, agua, arrendamiento, etc.)
- Reporte diario por barbero
- Depósitos registrados

**Modelos**: Expense, DailyReport

### 6. TRANSFERENCIAS BANCARIAS
- Registrar transferencia: receptor, monto, banco (Pichincha, Austro, Jardín Azuayo, JEP, Guayaquil)
- Historial por cliente/barbero/banco
- Conciliación

**Modelo**: Transfer (ya en Barber pero puede expandirse)

### 7. DEUDAS
- Registrar deuda: cliente, monto, fecha, concepto, estado (pendiente/parcial/pagado)
- Listar pendientes
- Registrar pagos

**Modelo**: Debt

### 8. USUARIOS
- Roles: Admin, Manager, Barber
- Login/JWT/Refresh token
- Cambio contraseña

**Modelo**: User

---

## ENDPOINTS BÁSICOS (FastAPI)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/sales
POST   /api/v1/sales
PUT    /api/v1/sales/{id}
DELETE /api/v1/sales/{id}

GET    /api/v1/barbers
POST   /api/v1/barbers
GET    /api/v1/barbers/{id}/dashboard

GET    /api/v1/inventory
POST   /api/v1/inventory/{id}/movement

GET    /api/v1/accounting/dashboard
POST   /api/v1/expenses

GET    /api/v1/transfers
POST   /api/v1/transfers

GET    /api/v1/debts
POST   /api/v1/debts/{id}/payment

(+ servicios, productos, usuarios)
```

---

## VISTAS FRONTEND (React)

1. **Login** - Username/password
2. **Dashboard** - Resumen, gráficos, top barberos, alertas stock
3. **Ventas** - Tabla, filtros, formulario nueva venta
4. **Barberos** - Listado, comisiones, dashboard individual
5. **Servicios/Productos** - CRUD
6. **Inventario** - Stock, movimientos, alertas
7. **Reportes** - Ingresos, gastos, utilidad, gráficos
8. **Transferencias** - Historial, registro
9. **Deudas** - Listado, pagos
10. **Admin** - Usuarios, configuración

---

## ESTRUCTURA CARPETAS

```
barberia-backend/
├── main.py
├── requirements.txt
├── .env / .env.example
├── Dockerfile
├── alembic/
├── app/
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   ├── models/ (sale, barber, service, inventory, expense, transfer, debt, user)
│   ├── schemas/ (ídem)
│   ├── crud/ (ídem + base.py)
│   ├── api/v1/
│   │   ├── endpoints/ (sales, barbers, inventory, accounting, transfers, debts, users)
│   │   └── router.py
│   └── utils/ (exports, validators)
└── tests/

barberia-frontend/
├── package.json
├── vite.config.ts
├── .env / .env.example
├── Dockerfile
├── src/
│   ├── components/ (Layout, Forms, Tables, Charts)
│   ├── pages/ (Dashboard, Sales, Barbers, Inventory, Accounting, Transfers, Debts, Login)
│   ├── services/ (api.ts, hooks para cada módulo)
│   ├── hooks/ (useAuth, useFetch, useForm, useTable)
│   ├── context/ (AuthContext, AppContext)
│   ├── types/ (index.ts, interfaces)
│   ├── utils/ (formatters, validators, constants, exporters)
│   ├── styles/ (Tailwind + custom)
│   └── main.tsx
```

---

## VARIABLES ENTORNO (.env)

```
# BD
DATABASE_URL=postgresql://barberia_user:password@localhost:5432/barberia_db
DB_USER=barberia_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barberia_db

# JWT
SECRET_KEY=<openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# APP
APP_NAME=Barberia Hair Craft API
APP_VERSION=1.0.0
DEBUG=False
ENVIRONMENT=production

# CORS
CORS_ORIGINS=["http://localhost:5173","http://localhost:8000"]

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Barberia Hair Craft
VITE_ENVIRONMENT=development
```

---

## DOCKER COMPOSE

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./barberia-backend
      dockerfile: Dockerfile
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - ./barberia-backend:/app
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./barberia-frontend
      dockerfile: Dockerfile
    volumes:
      - ./barberia-frontend:/app
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Dockerfiles**: Usa python:3.11-slim para backend, node:18-alpine para frontend

---

## SETUP RÁPIDO

```bash
# Clonar y configurar
git clone <repo>
cd barberia-app
cp .env.example .env
nano .env  # Editar credenciales

# Con Docker (recomendado)
docker-compose up -d
docker-compose exec backend alembic upgrade head

# Local
# Backend: cd barberia-backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload
# Frontend: cd barberia-frontend && npm install && npm run dev
```

---

## REQUIREMENTS & DEPENDENCIES

**Backend** (requirements.txt):
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
alembic==1.12.1
python-dotenv==1.0.0
slowapi==0.1.9
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.1
openpyxl==3.11.0
reportlab==4.0.7
```

**Frontend** (package.json deps):
```
react@18.2.0, react-dom@18.2.0, react-router-dom@6.20.0, axios@1.6.0
react-hook-form@7.48.0, zod@3.22.0, @hookform/resolvers@3.3.0
react-query@3.39.0, recharts@2.10.0, react-hot-toast@2.4.1
react-table@8.11.0, react-dropzone@14.2.0, xlsx@0.18.5, jspdf@2.5.1
date-fns@2.30.0, react-day-picker@8.9.0, @headlessui/react@1.7.17
tailwindcss@3.3.6
```

---

## CHECKLIST IMPLEMENTACIÓN

**Backend**:
- [ ] Modelos SQLAlchemy con relaciones
- [ ] Schemas Pydantic con validaciones
- [ ] CRUD básico para cada modelo
- [ ] Routers RESTful con auth
- [ ] Paginación y filtros
- [ ] Manejo de errores (HTTPException)
- [ ] Logging
- [ ] Tests unitarios mínimos

**Frontend**:
- [ ] Layout base (Header, Sidebar, Footer)
- [ ] Login con JWT
- [ ] Rutas protegidas
- [ ] Tablas con Recharts
- [ ] Formularios validados
- [ ] Notificaciones (toast)
- [ ] Export Excel/PDF
- [ ] Responsive (mobile-first)

**General**:
- [ ] CORS configurado
- [ ] Variables .env sin hardcoding
- [ ] .gitignore (.env, __pycache__, node_modules)
- [ ] Migraciones Alembic
- [ ] Docker sin privilegios
- [ ] Health check endpoints
- [ ] Swagger docs (FastAPI auto)

---

## NOTAS

- SECRET_KEY: `openssl rand -hex 32`
- NUNCA commitear `.env` → incluir solo `.env.example`
- PostgreSQL en producción (no SQLite)
- JWT refresh tokens para seguridad
- Rate limiting en endpoints críticos
- Validar inputs Backend + Frontend
- HTTPS obligatorio en prod
- Backups automáticos de BD

---

**Archivos estándar que va a necesitar**:
- .env y .env.example (raíz)
- .gitignore (raíz)
- docker-compose.yml (raíz)
- Dockerfile (backend y frontend)
- requirements.txt (backend)
- package.json (frontend)
- vite.config.ts (frontend)
- pyproject.toml o similar (backend)
