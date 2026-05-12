Plan: Dividir bank_transfer en Sale → Bank FK + bank_transfer_value
       + Normalizar BankTransfer.bank → Bank FK
       + Campo account en Bank

 Context

 Sale.bank_transfer solo guardaba el monto de transferencia (Float). BankTransfer.bank guardaba el
 nombre del banco como texto libre. La solución: crear modelo Bank con campo account (número de cuenta
 por defecto), relacionarlo con Sale (bank_transfer_id FK + bank_transfer_value) y BankTransfer
 (bank_id FK). Frontend usa dropdown dinámico desde la API en lugar de lista estática.

 No hay Alembic — se usa create_all + script de migración SQLite.

 ---
 Backend

 1. Nuevo modelo Bank

 Archivo: backend/app/models/bank.py
 class Bank(Base):
     __tablename__ = "banks"
     id = Column(Integer, primary_key=True, index=True)
     name = Column(String(100), nullable=False, unique=True)
     account = Column(String(50), nullable=True)  # número de cuenta por defecto
     sales = relationship("Sale", back_populates="bank")
     bank_transfers = relationship("BankTransfer", back_populates="bank")

 2. Modificar BankTransfer model

 Archivo: backend/app/models/barber.py
 - Quitar: bank = Column(String(50))
 - Agregar:
   - bank_id = Column(Integer, ForeignKey("banks.id"), nullable=True)
   - bank = relationship("Bank", back_populates="bank_transfers")

 3. Modificar Sale model

 Archivo: backend/app/models/sale.py
 - Quitar: bank_transfer = Column(Float, default=0.0)
 - Agregar:
   - bank_transfer_id = Column(Integer, ForeignKey("banks.id"), nullable=True)
   - bank_transfer_value = Column(Float, default=0.0)
   - bank = relationship("Bank", back_populates="sales")

 4. Nuevo schema Bank

 Archivo: backend/app/schemas/bank.py
 class BankOut(BaseModel):
     id: int
     name: str
     account: Optional[str] = None
     model_config = {"from_attributes": True}

 5. Schemas de BankTransfer

 Archivo: backend/app/schemas/barber.py
 - BankTransferCreate: bank: str → bank_id: Optional[int] = None
 - BankTransferOut: reescribir sin herencia; agregar bank_name: Optional[str], bank_account: Optional[str]

 6. Schemas de Sale

 Archivo: backend/app/schemas/sale.py
 - SaleBase: bank_transfer: float = 0.0 → bank_transfer_id: Optional[int], bank_transfer_value: float = 0.0
 - SaleUpdate: mismos campos opcionales
 - SaleOut: agregar bank_name: Optional[str] = None

 7. CRUD de Bank

 Archivo: backend/app/crud/bank.py
 - get_banks(db) — lista todos
 - get_bank(db, id) — uno solo

 8. CRUD de BankTransfer

 Archivo: backend/app/crud/barber.py
 - get_bank_transfer(db, id) — con joinedload(BankTransfer.bank)
 - create_bank_transfer: después de commit, retorna get_bank_transfer para incluir relación
 - get_bank_transfers: agregar joinedload(BankTransfer.bank)

 9. CRUD de Sale

 Archivo: backend/app/crud/sale.py
 - get_sales / get_sale: agregar joinedload(Sale.bank)
 - get_daily_summary: s.bank_transfer → s.bank_transfer_value

 10. CRUD de Expense (accounting)

 Archivo: backend/app/crud/expense.py
 - get_accounting_dashboard: s.bank_transfer → s.bank_transfer_value

 11. Endpoint de bancos

 Archivo: backend/app/api/v1/endpoints/banks.py (nuevo)
 - GET / → lista bancos (requiere auth)

 12. Endpoint de transfers (barbers)

 Archivo: backend/app/api/v1/endpoints/barbers.py
 - Agregar helper _transfer_to_out(t) → dict con bank_name y bank_account
 - new_transfer: retorna BankTransferOut(**_transfer_to_out(t))
 - list_transfers: retorna lista de BankTransferOut

 13. Endpoint de sales

 Archivo: backend/app/api/v1/endpoints/sales.py
 - _to_out: bank_transfer → bank_transfer_id + bank_transfer_value + bank_name

 14. Router principal

 Archivo: backend/app/api/v1/router.py
 - Agregar: api_router.include_router(banks.router, prefix="/banks", tags=["banks"])

 15. __init__.py de models

 Archivo: backend/app/models/__init__.py
 - Importar Bank primero (antes de otros modelos con FK a banks)

 16. Script de migración SQLite

 Archivo: backend/migrate_bank.py
 - Crea tabla banks con columnas id, name, account
 - Inserta 6 bancos iniciales: Pichincha, Austro, Jardín Azuayo, JEP, Guayaquil, Otro
 - Sale: RENAME bank_transfer → bank_transfer_value + ADD bank_transfer_id FK
 - BankTransfer: RENAME bank → bank_name + ADD bank_id FK + UPDATE bank_id desde bank_name
 - Script idempotente: verifica columnas antes de migrar

 17. Tests API

 Archivos: backend/tests/conftest.py, test_banks.py, test_sales.py
 - conftest: SQLite :memory: con StaticPool, override get_db y get_current_user
 - test_banks: list vacío, list con datos, campo account, account nulo
 - test_sales: crear sin/con banco, listar, actualizar banco, daily-summary.transfer_income

 ---
 Frontend

 18. Tipo Bank e interfaces actualizadas

 Archivo: frontend/src/types/index.ts
 - Agregar interfaz Bank: { id: number; name: string; account?: string }
 - BankTransfer: bank: string → bank_id?: number, bank_name?: string, bank_account?: string
 - Sale: bank_transfer: number → bank_transfer_id?: number, bank_transfer_value: number, bank_name?: string

 19. API service

 Archivo: frontend/src/services/api.ts
 - Agregar: export const banksApi = { list: () => api.get('/banks/') }

 20. Página Transfers

 Archivo: frontend/src/pages/Transfers.tsx
 - Importar banksApi, Bank type
 - Estado: banks: Bank[], fetch en useEffect
 - Form: dropdown banco (bank_id) con primera opción "Sin banco"
 - Auto-muestra campo "Cuenta del banco" (readonly) cuando el banco seleccionado tiene account
 - Payload: bank_id (number | null) en lugar de bank (string)
 - Tabla: columna Banco muestra bank_name + bank_account como subtext

 21. Página Sales

 Archivo: frontend/src/pages/Sales.tsx
 - Importar banksApi, Bank type
 - Estado: banks: Bank[], fetch en useEffect junto con barbers/services/products
 - emptyForm: bank_transfer_id: '', bank_transfer_value: '0' (quitar bank_transfer)
 - Form modal: dropdown "Banco transferencia" + input "Monto transferencia"
 - Payload: bank_transfer_id (number | null) + bank_transfer_value (number)
 - Tabla: columna Transfer. muestra monto + bank_name como subtext
 - Al editar: poblar bank_transfer_id y bank_transfer_value desde el objeto Sale

 ---
 Orden de ejecución

 1. Script de migración: python3 backend/migrate_bank.py
 2. Backend: modelo → schemas → crud → endpoints → router → __init__
 3. Tests: cd backend && venv/bin/pytest tests/ -v → 9 passed
 4. Frontend: types → api → Transfers.tsx → Sales.tsx

 Verificación

 1. python3 backend/migrate_bank.py → sin errores
 2. GET /api/v1/banks/ → retorna lista de 6 bancos con campo account
 3. POST /barbers/transfers/ con bank_id=1, amount=100 → bank_name y bank_account en response
 4. GET /barbers/transfers/list → cada transfer tiene bank_name y bank_account
 5. POST /api/v1/sales/ con bank_transfer_id=1, bank_transfer_value=50 → bank_name en response
 6. GET /api/v1/sales/daily-summary → transfer_income calcula con bank_transfer_value
 7. venv/bin/pytest tests/ -v → 9 passed
 8. Frontend Transfers: dropdown dinámico, cuenta auto-rellena, tabla muestra banco+cuenta
 9. Frontend Sales: dropdown banco + monto, tabla muestra banco bajo el monto
