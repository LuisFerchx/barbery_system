"""
Run: python seed.py
Seeds initial data for the Barbery System with multi-company support.
"""

import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DATABASE_URL", "sqlite:///./barberia.db")

from app.database import SessionLocal, engine, Base
from app.models import (
    User, Barber, ServiceCatalog, ProductCatalog,
    InventoryItem, IncomeSplitConfig, PaymentMethodConfig,
    OperatingManualEntry,
)
from app.models.company import Company
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed(label, query, create):
    if not query():
        obj = create()
        db.add(obj) if not isinstance(obj, list) else [db.add(o) for o in obj]
        db.commit()
        print(f"✓ {label}")
    else:
        print(f"· {label} ya existe")


# ── Superadmin (sin empresa, acceso global) ───────────────────────────────
seed(
    "Superadmin (superadmin/superadmin123)",
    lambda: db.query(User).filter(User.username == "superadmin").first(),
    lambda: User(
        username="superadmin",
        full_name="Super Administrador",
        role="superadmin",
        company_id=None,
        hashed_password=hash_password("superadmin123"),
        is_active=True,
    ),
)

# ── Empresa principal ─────────────────────────────────────────────────────
company = db.query(Company).filter(Company.slug == "main").first()
if not company:
    company = Company(name="BarberCraft System", slug="main", is_active=True)
    db.add(company)
    db.commit()
    db.refresh(company)
    print("✓ Empresa principal creada")
else:
    print("· Empresa principal ya existe")

COMPANY_ID = company.id

# ── Admin del company ─────────────────────────────────────────────────────
seed(
    "Admin (admin/admin123)",
    lambda: db.query(User).filter(User.username == "admin").first(),
    lambda: User(
        username="admin",
        full_name="Administrador",
        role="admin",
        company_id=COMPANY_ID,
        hashed_password=hash_password("admin123"),
        is_active=True,
    ),
)

# ── Barbers ───────────────────────────────────────────────────────────────
BARBERS = [
    {"name": "Carlos", "lastname": "Mendez", "phone": "555-0001", "commission_rate": Decimal("0.40")},
    {"name": "Luis",   "lastname": "Gomez",  "phone": "555-0002", "commission_rate": Decimal("0.40")},
    {"name": "Marco",  "lastname": "Silva",  "phone": "555-0003", "commission_rate": Decimal("0.35")},
]
for b in BARBERS:
    if not db.query(Barber).filter(
        Barber.name == b["name"],
        Barber.lastname == b["lastname"],
        Barber.company_id == COMPANY_ID,
    ).first():
        db.add(Barber(**b, company_id=COMPANY_ID))
db.commit()
print("✓ Barberos (3)")

# ── Service catalog ───────────────────────────────────────────────────────
SERVICES = [
    {"name": "Corte Básico",       "category": "haircut", "price": Decimal("150")},
    {"name": "Arreglo de Barba",   "category": "beard",   "price": Decimal("80")},
    {"name": "Corte + Barba",      "category": "combo",   "price": Decimal("200")},
    {"name": "Filos",              "category": "other",   "price": Decimal("50")},
    {"name": "Depilación",         "category": "other",   "price": Decimal("60")},
]
for s in SERVICES:
    if not db.query(ServiceCatalog).filter(
        ServiceCatalog.name == s["name"],
        ServiceCatalog.company_id == COMPANY_ID,
    ).first():
        db.add(ServiceCatalog(**s, company_id=COMPANY_ID))
db.commit()
print("✓ Catálogo de servicios (5)")

# ── Product catalog ───────────────────────────────────────────────────────
PRODUCTS = [
    {"name": "Minoxidil",    "brand": "Kirkland", "cost_price": Decimal("80"),  "sale_price": Decimal("150")},
    {"name": "Cera de Pelo", "brand": "Gatsby",   "cost_price": Decimal("30"),  "sale_price": Decimal("60")},
    {"name": "Fijador",      "brand": "Revlon",   "cost_price": Decimal("25"),  "sale_price": Decimal("50")},
]
for p in PRODUCTS:
    if not db.query(ProductCatalog).filter(
        ProductCatalog.name == p["name"],
        ProductCatalog.company_id == COMPANY_ID,
    ).first():
        db.add(ProductCatalog(**p, company_id=COMPANY_ID))
db.commit()
print("✓ Catálogo de productos (3)")

# ── Inventory items ───────────────────────────────────────────────────────
INVENTORY = [
    {"name": "Agua",         "category": "courtesy",    "unit": "botella", "stock_current": Decimal("50"), "stock_minimum": Decimal("10"), "cost_per_unit": Decimal("5")},
    {"name": "Refresco",     "category": "courtesy",    "unit": "lata",    "stock_current": Decimal("50"), "stock_minimum": Decimal("10"), "cost_per_unit": Decimal("8")},
    {"name": "Minoxidil",    "category": "merchandise", "unit": "frasco",  "stock_current": Decimal("20"), "stock_minimum": Decimal("5"),  "cost_per_unit": Decimal("80")},
    {"name": "Cera de Pelo", "category": "merchandise", "unit": "tarro",   "stock_current": Decimal("15"), "stock_minimum": Decimal("5"),  "cost_per_unit": Decimal("30")},
    {"name": "Fijador",      "category": "merchandise", "unit": "frasco",  "stock_current": Decimal("10"), "stock_minimum": Decimal("3"),  "cost_per_unit": Decimal("25")},
]
for item in INVENTORY:
    if not db.query(InventoryItem).filter(
        InventoryItem.name == item["name"],
        InventoryItem.company_id == COMPANY_ID,
    ).first():
        db.add(InventoryItem(**item, company_id=COMPANY_ID))
db.commit()
print("✓ Inventario (5 items: 2 cortesía, 3 mercancía)")

# ── Income split config ───────────────────────────────────────────────────
SPLIT = [
    {"name": "profit",       "percentage": Decimal("0.40")},
    {"name": "owner_salary", "percentage": Decimal("0.30")},
    {"name": "taxes",        "percentage": Decimal("0.20")},
    {"name": "operating",    "percentage": Decimal("0.10")},
]
for s in SPLIT:
    if not db.query(IncomeSplitConfig).filter(
        IncomeSplitConfig.name == s["name"],
        IncomeSplitConfig.company_id == COMPANY_ID,
    ).first():
        db.add(IncomeSplitConfig(**s, company_id=COMPANY_ID))
db.commit()
print("✓ Configuración de split (40/30/20/10)")

# ── Payment method config ─────────────────────────────────────────────────
PAYMENT_METHODS = [
    {"method": "cash",        "commission_rate": Decimal("0.00")},
    {"method": "card_debit",  "commission_rate": Decimal("0.02")},
    {"method": "card_credit", "commission_rate": Decimal("0.03")},
    {"method": "transfer",    "commission_rate": Decimal("0.01")},
]
for pm in PAYMENT_METHODS:
    if not db.query(PaymentMethodConfig).filter(
        PaymentMethodConfig.method == pm["method"],
        PaymentMethodConfig.company_id == COMPANY_ID,
    ).first():
        db.add(PaymentMethodConfig(**pm, company_id=COMPANY_ID))
db.commit()
print("✓ Configuración de métodos de pago")

# ── Operating manual entries ──────────────────────────────────────────────
MANUAL = [
    {
        "section": "courtesy_protocol",
        "title": "Protocolo de Bebida de Cortesía",
        "content": "Al iniciar el corte, ofrecer la bebida de cortesía al cliente:\n\n\"Bienvenido, ¿le gustaría una bebida mientras lo atendemos? Tenemos agua y refresco.\"\n\nAsegurarse de registrar si se ofreció en el sistema.",
        "order_index": 1,
    },
    {
        "section": "cross_sell_script",
        "title": "Script de Venta Cruzada de Productos",
        "content": "Al finalizar el corte, mostrar los productos disponibles:\n\n\"¿Le interesaría llevar alguno de nuestros productos? Tenemos minoxidil, cera y fijador.\"\n\nRecuerda marcar la venta cruzada en el sistema.",
        "order_index": 1,
    },
    {
        "section": "checkout_procedure",
        "title": "Procedimiento de Cobro",
        "content": "**Cobro en efectivo:**\n1. Indicar el monto total al cliente\n2. Recibir el pago\n3. Registrar en el sistema como método: Efectivo\n\n**Cobro con terminal:**\n1. Indicar el monto al cliente\n2. Procesar en terminal bancaria\n3. Esperar confirmación\n4. Registrar en sistema según tipo: Débito o Crédito",
        "order_index": 1,
    },
]
for entry in MANUAL:
    if not db.query(OperatingManualEntry).filter(
        OperatingManualEntry.section == entry["section"],
        OperatingManualEntry.title == entry["title"],
        OperatingManualEntry.company_id == COMPANY_ID,
    ).first():
        db.add(OperatingManualEntry(**entry, company_id=COMPANY_ID))
db.commit()
print("✓ Manual de operaciones (3 secciones)")

company_name = company.name
db.close()
print("\n✓ Seed completado exitosamente")
print(f"  - superadmin / superadmin123  (acceso global)")
print(f"  - admin / admin123            (empresa: {company_name})")
