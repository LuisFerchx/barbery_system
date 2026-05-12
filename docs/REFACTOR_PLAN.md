# Plan de Refactorización — Barbery System

## Contexto

Sistema actual: FastAPI + SQLAlchemy (SQLite/PostgreSQL) + React 18 + Vite + TypeScript.
La base de datos se descarta completamente. Se diseña desde cero alrededor de los 5 módulos de negocio.

---

## Visión general de los 5 módulos

| # | Módulo | Propósito core |
|---|--------|---------------|
| 1 | Caja y Registro de Ventas | Motor financiero: registra transacciones con desglose de comisiones y distribución de ingresos |
| 2 | Control de Inventarios | Mercancía para reventa + bebidas de cortesía con descuento automático por corte |
| 3 | Diagnóstico de Clientes | Retención, clientes nuevos vs recurrentes, venta cruzada por barbero |
| 4 | Tablero de Control | Utilidad neta en tiempo real para el dueño |
| 5 | Manual de Operaciones | Protocolos del negocio embebidos en el sistema |

---

## Fase 0 — Limpieza y base nueva

### Acciones

- Eliminar `backend/barberia.db`
- Borrar todos los modelos SQLAlchemy actuales y los archivos Alembic
- Inicializar Alembic limpio con `alembic init migrations`
- Mantener la estructura de carpetas (`models/`, `schemas/`, `crud/`, `api/v1/endpoints/`) pero vaciar los archivos

### Archivos a eliminar en backend

```
app/models/barber.py
app/models/sale.py
app/models/service.py
app/models/inventory.py
app/models/debt.py
app/models/expense.py
```

### Archivos a eliminar en frontend

```
src/pages/Debts.tsx
src/pages/Transfers.tsx
```

---

## Fase 1 — Nuevo esquema de base de datos

### Entidades principales

#### `barbers`
```sql
id, name, lastname, phone, commission_rate (decimal, ej. 0.40), is_active, created_at
```

#### `service_catalog`
```sql
id, name, category (ENUM: haircut, beard, combo, other), price, is_active
```

#### `product_catalog`
```sql
id, name, brand, cost_price, sale_price, is_active
```

#### `sales`
```sql
id
date                        -- timestamp
client_name                 -- opcional
is_returning_client         -- boolean (Módulo 3)
barber_id                   -- FK barbers
service_id                  -- FK service_catalog
product_id                  -- FK product_catalog, nullable
gross_total                 -- total cobrado al cliente
payment_method              -- ENUM: cash, card_debit, card_credit, transfer
bank_commission_rate        -- decimal (ej. 0.02 para tarjeta)
bank_commission_amount      -- gross_total * bank_commission_rate
barber_commission_amount    -- (gross_total - bank_commission_amount) * commission_rate
real_income                 -- gross_total - bank_commission_amount - barber_commission_amount
-- Distribución del real_income (ver reglas de negocio en Módulo 1)
split_profit                -- real_income * factor_ganancia
split_owner_salary          -- real_income * factor_sueldo_dueño
split_taxes                 -- real_income * factor_impuestos
split_operating             -- real_income * factor_gastos_operacion
courtesy_drink_given        -- boolean (Módulo 2)
cross_sell                  -- boolean: compró producto además del servicio (Módulo 3)
notes
```

#### `income_split_config`
```sql
id, name (profit/owner_salary/taxes/operating), percentage, updated_at
```
> Tabla de configuración del dueño para definir cómo se distribuye el `real_income`.

#### `payment_method_config`
```sql
id, method (card_debit/card_credit/transfer/cash), commission_rate, updated_at
```

#### `inventory_items`
```sql
id
name
category                    -- ENUM: merchandise (reventa), courtesy (bebidas)
unit                        -- unidad de medida
stock_current
stock_minimum               -- umbral para alerta de resurtido
cost_per_unit
is_active
```

#### `inventory_movements`
```sql
id, item_id, movement_type (in/out/adjustment), quantity, reason, sale_id (nullable), date
```
> Cuando `category = courtesy`, cada venta con `courtesy_drink_given = true` genera un `inventory_movement` automático de tipo `out`.

#### `expenses`
```sql
id, date, category (ENUM: rent, utilities, supplies, marketing, other), description, amount, payment_method
```

#### `operating_manual_entries`
```sql
id, section (ENUM: courtesy_protocol, cross_sell_script, checkout_procedure, other),
title, content (text), order_index, updated_at, updated_by
```

#### `users`
```sql
id, username, email, hashed_password, role (ENUM: admin, barber), is_active, created_at
```

---

## Fase 2 — Refactorización Backend

### Estructura de archivos actualizada

```
backend/app/
├── models/
│   ├── user.py
│   ├── barber.py
│   ├── catalog.py          -- ServiceCatalog + ProductCatalog
│   ├── sale.py             -- Sale (campo expandido)
│   ├── inventory.py        -- InventoryItem + InventoryMovement
│   ├── expense.py
│   ├── config.py           -- IncomeSplitConfig + PaymentMethodConfig
│   └── manual.py           -- OperatingManualEntry
├── schemas/
│   ├── (mismo patrón, uno por dominio)
├── crud/
│   ├── sale.py             -- lógica de cálculo de comisiones y split
│   ├── inventory.py        -- descuento automático de bebida
│   ├── analytics.py        -- métricas Módulo 3
│   ├── dashboard.py        -- cálculo de utilidad neta Módulo 4
│   └── manual.py
└── api/v1/endpoints/
    ├── auth.py
    ├── sales.py            -- POST /sales (calcula todo al registrar)
    ├── catalog.py
    ├── inventory.py
    ├── expenses.py
    ├── analytics.py        -- GET /analytics/clients, /analytics/cross-sell
    ├── dashboard.py        -- GET /dashboard/summary
    ├── config.py           -- PUT /config/split, /config/payment-methods
    └── manual.py           -- CRUD /manual/entries
```

### Lógica de negocio crítica en `crud/sale.py`

```python
def calculate_sale_financials(gross_total, payment_method, barber_commission_rate, config):
    bank_rate = config.payment_methods[payment_method].commission_rate
    bank_commission = gross_total * bank_rate
    real_income = gross_total - bank_commission
    barber_commission = real_income * barber_commission_rate
    net_for_split = real_income - barber_commission
    return {
        "bank_commission_amount": bank_commission,
        "barber_commission_amount": barber_commission,
        "real_income": real_income,
        "split_profit": net_for_split * config.split.profit,
        "split_owner_salary": net_for_split * config.split.owner_salary,
        "split_taxes": net_for_split * config.split.taxes,
        "split_operating": net_for_split * config.split.operating,
    }
```

### Lógica automática de inventario en `crud/inventory.py`

```python
def auto_deduct_courtesy_drink(sale_id, db):
    # Al crear una venta con courtesy_drink_given=True,
    # busca el item activo de categoría 'courtesy' con menos stock
    # y crea un InventoryMovement(type='out', quantity=1, sale_id=sale_id)
```

### Nuevos endpoints de analítica (`analytics.py`)

```
GET /analytics/clients?month=YYYY-MM
  → { new_clients: int, returning_clients: int, retention_rate: float }

GET /analytics/cross-sell?month=YYYY-MM
  → { total_sales: int, cross_sell_count: int, rate: float,
      by_barber: [{ barber_id, name, cross_sell_rate }] }
```

### Endpoint de tablero (`dashboard.py`)

```
GET /dashboard/summary?month=YYYY-MM
  → {
      gross_income,
      bank_commissions_total,
      barber_commissions_total,
      real_income_total,
      total_expenses,
      operating_profit,          -- real_income - expenses
      taxes_reserved,
      net_profit,                -- operating_profit - taxes_reserved
      split_breakdown: { profit, owner_salary, taxes, operating },
      inventory_alerts: [items below minimum stock]
    }
```

---

## Fase 3 — Refactorización Frontend

### Páginas a crear / reemplazar

| Ruta | Página | Módulo |
|------|--------|--------|
| `/` | `Dashboard.tsx` | Módulo 4 |
| `/sales/new` | `NewSale.tsx` | Módulo 1 |
| `/sales` | `SalesHistory.tsx` | Módulo 1 |
| `/inventory` | `Inventory.tsx` | Módulo 2 |
| `/analytics` | `Analytics.tsx` | Módulo 3 |
| `/catalog` | `Catalog.tsx` | Soporte M1 |
| `/barbers` | `Barbers.tsx` | Soporte M1 |
| `/expenses` | `Expenses.tsx` | Soporte M4 |
| `/settings` | `Settings.tsx` | Configuración split y comisiones |
| `/manual` | `OperatingManual.tsx` | Módulo 5 |
| `/admin` | `Admin.tsx` | Gestión de usuarios y configuración global |

### Páginas a eliminar

- `Debts.tsx` — fuera de alcance del nuevo diseño
- `Transfers.tsx` — absorbido por el campo `payment_method` en ventas
- ~~`Admin.tsx`~~ — **se conserva y se refactoriza** (ver detalle abajo)
- `Accounting.tsx` — reemplazado por `Dashboard.tsx` + `Expenses.tsx`

### Detalle por página

#### `NewSale.tsx` (Módulo 1 — crítico)

**Flujo del formulario:**

1. Seleccionar barbero (dropdown)
2. Nombre del cliente + toggle "¿Es cliente recurrente?"
3. Seleccionar servicio del catálogo
4. Seleccionar producto (opcional) — venta cruzada
5. Toggle "¿Se ofreció bebida de cortesía?"
6. Método de pago (cash / card_debit / card_credit / transfer)
7. Panel de preview en tiempo real:
   - Total bruto
   - Comisión bancaria (calculada según método de pago)
   - Comisión del barbero
   - **Ingreso Real** (destacado)
   - Desglose del split: Ganancia / Sueldo dueño / Impuestos / Gastos

```tsx
// Componente clave: FinancialBreakdownPreview
// Se actualiza en tiempo real con react-hook-form watch()
// Consume los mismos factores que el backend para consistencia visual
```

#### `Dashboard.tsx` (Módulo 4 — pantalla principal del dueño)

**Secciones:**

1. **KPIs del mes** (StatCards):
   - Ingreso Bruto
   - Ingreso Real (neto de comisiones bancarias)
   - Gastos Operativos
   - **Utilidad Neta** (la última línea — tarjeta destacada en verde/rojo)

2. **Distribución del ingreso** (gráfica de dona con recharts):
   - Ganancia / Sueldo dueño / Impuestos reservados / Gastos operación

3. **Alertas de inventario** (lista roja de ítems bajo el mínimo)

4. **Top barberos** por ingreso real generado

5. **Selector de mes** para ver histórico

#### `Analytics.tsx` (Módulo 3)

**Secciones:**

1. **Clientes nuevos vs recurrentes** (barras o donut por mes)
2. **Tasa de retención** del mes anterior
3. **Venta cruzada por barbero** (tabla ordenable):
   - Barbero / Cortes realizados / Productos vendidos / Tasa de cross-sell

#### `Inventory.tsx` (Módulo 2)

**Dos tabs:**

1. **Mercancía** (productos para reventa)
   - Tabla con stock actual, mínimo, costo, precio de venta
   - Botón registrar entrada/salida manual

2. **Bebidas de Cortesía**
   - Stock actual
   - Consumo automático del mes (generado por ventas)
   - Costo variable por corte
   - Alerta de resurtido

#### `Admin.tsx` (Gestión de usuarios y configuración global — solo rol admin)

**Secciones:**

1. **Gestión de usuarios**
   - Tabla de usuarios (admin + barberos) con estado activo/inactivo
   - Crear usuario nuevo con rol asignado
   - Cambiar contraseña / desactivar cuenta

2. **Configuración de barberos**
   - Alta y edición de barberos (nombre, teléfono, tasa de comisión)
   - Activar / desactivar barbero

3. **Configuración de catálogo**
   - Servicios: crear, editar, activar/desactivar
   - Productos: crear, editar, precio de costo y venta

> `Settings.tsx` maneja la configuración financiera (split e comisiones bancarias). `Admin.tsx` maneja la configuración de personas y catálogo. Ambas páginas son complementarias y solo visibles para el rol `admin`.

---

#### `OperatingManual.tsx` (Módulo 5)

**Secciones editables** (solo admin):

1. **Protocolo de Bebida de Cortesía**
   - En qué momento del corte se ofrece
   - Palabras exactas a usar

2. **Script de Venta Cruzada**
   - Cómo sugerir el minoxidil / cera al finalizar
   - Frases sugeridas

3. **Procedimiento de Cobro**
   - Pasos para cobro en efectivo
   - Pasos para cobro con terminal

Cada sección es un editor de texto enriquecido (o Markdown) editable por el admin y visible en modo lectura para los barberos.

#### `Settings.tsx` (Configuración del dueño)

1. **Distribución de ingresos** — sliders o inputs con validación de que sumen 100%
   - % Ganancia
   - % Sueldo dueño
   - % Impuestos
   - % Gastos operación

2. **Comisiones por método de pago** — tabla editable
   - Efectivo: 0%
   - Débito: X%
   - Crédito: X%
   - Transferencia: X%

---

## Fase 4 — Migración de datos (seed inicial)

Crear `backend/seed.py` con:

```python
# 1. Usuarios: 1 admin + barberos de prueba
# 2. Catálogo de servicios: corte básico, arreglo barba, combo
# 3. Catálogo de productos: fijador, minoxidil, cera
# 4. Inventario: bebidas de cortesía (agua, refresco) con stock inicial
# 5. Config de split por defecto: 40% ganancia, 30% sueldo dueño, 20% impuestos, 10% operación
# 6. Config de comisiones: débito 2%, crédito 3%
# 7. Manual de operaciones: entradas placeholder por sección
```

---

## Orden de implementación recomendado

```
Semana 1 — Backend core
  [ ] Nuevo schema DB + Alembic migration inicial
  [ ] Modelos: User, Barber, ServiceCatalog, ProductCatalog, Sale (expandido)
  [ ] CRUD sale con cálculo de comisiones y split
  [ ] Endpoints: POST /sales, GET /sales, GET /sales/{id}
  [ ] Endpoint: GET /dashboard/summary

Semana 2 — Backend completo
  [ ] Modelos: Inventory, Expense, Config, OperatingManual
  [ ] CRUD inventory con auto-descuento de bebida
  [ ] Endpoints: /inventory, /expenses, /config, /manual
  [ ] Endpoints: /analytics/clients, /analytics/cross-sell
  [ ] Seed script

Semana 3 — Frontend core
  [ ] Actualizar types/index.ts con nuevas interfaces
  [ ] Actualizar services/api.ts con nuevos endpoints
  [ ] NewSale.tsx con preview financiero en tiempo real
  [ ] Dashboard.tsx con utilidad neta y KPIs

Semana 4 — Frontend completo
  [ ] Analytics.tsx (retención + cross-sell)
  [ ] Inventory.tsx (dos tabs)
  [ ] Settings.tsx (split + comisiones)
  [ ] OperatingManual.tsx (lectura + edición admin)
  [ ] Expenses.tsx
  [ ] Actualizar Sidebar con nueva navegación
  [ ] Eliminar páginas obsoletas
```

---

## Consideraciones técnicas

### Backend

- **Validación de split en `config.py`:** el endpoint `PUT /config/split` debe validar que la suma de los 4 porcentajes sea exactamente 1.0 (100%).
- **Comisión bancaria:** guardar `bank_commission_rate` en cada venta al momento del registro, no como FK a config, para que los reportes históricos sean correctos aunque cambie la config en el futuro.
- **Índices DB recomendados:** `sales.date`, `sales.barber_id`, `sales.payment_method`, `inventory_movements.item_id`.
- **Alembic:** cada cambio de schema genera una nueva migración; no usar `create_all()` en producción.

### Frontend

- **Preview financiero:** calcular en el cliente con los mismos valores de config cargados al inicio de sesión para evitar llamadas API en cada keystroke.
- **Persistencia de config:** cargar `IncomeSplitConfig` y `PaymentMethodConfig` en el `AuthContext` al login y exponerlos globalmente.
- **Rol barbero:** solo ve `NewSale`, su propio historial, y el `OperatingManual` en modo lectura. No accede a `Dashboard`, `Analytics`, ni `Settings`.

---

## Archivos que NO cambian

- `docker-compose.yml` — solo ajustar nombres de servicio si es necesario
- `frontend/vite.config.ts`
- `backend/config.py` — settings de env vars
- `backend/security.py` — JWT
- `frontend/src/context/AuthContext.tsx` — solo agregar config al estado
- `frontend/src/utils/format.ts`
- Componentes UI: `Modal.tsx`, `StatCard.tsx`, `Table.tsx`