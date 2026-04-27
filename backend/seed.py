"""
Run: python seed.py
Seeds initial data: default admin user, barbers, services, products from CSV.
"""

import csv, sys, os
from datetime import datetime, date
from decimal import Decimal
import re

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault(
    "DATABASE_URL", "sqlite:///./barberia.db"
)

from app.database import SessionLocal, engine
from app.models import *
from app.database import Base
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Admin user
if not db.query(User).filter(User.username == "admin").first():
    db.add(
        User(
            username="admin",
            full_name="Administrador",
            role="admin",
            hashed_password=hash_password("admin123"),
            is_active=True,
        )
    )
    db.commit()
    print("✓ Admin creado (admin/admin123)")

# Barbers from CSV
BARBERS = [
    {"name": "Kevin", "commission_rate": 45.0},
    {"name": "Javier", "commission_rate": 45.0},
    {"name": "Elvis", "commission_rate": 45.0},
    {"name": "May", "commission_rate": 45.0},
]
barber_map = {}
for b_data in BARBERS:
    existing = db.query(Barber).filter(Barber.name.ilike(b_data["name"])).first()
    if not existing:
        b = Barber(**b_data)
        db.add(b)
        db.flush()
        barber_map[b_data["name"].upper()] = b.id
    else:
        barber_map[b_data["name"].upper()] = existing.id
db.commit()
print("✓ Barberos creados")

# Services
SERVICES = [
    {"name": "CABELLO", "price": 9.0, "commission": 4.0},
    {"name": "CABELLO Y BARBA", "price": 16.0, "commission": 7.0},
    {"name": "BARBA", "price": 9.0, "commission": 4.0},
    {"name": "DEPILACION", "price": 3.5, "commission": 1.5},
    {"name": "FILOS", "price": 4.0, "commission": 2.0},
    {"name": "LIMPIEZA", "price": 12.0, "commission": 5.0},
    {"name": "PERMANENTE", "price": 50.0, "commission": 20.0},
]
service_map = {}
for s_data in SERVICES:
    existing = db.query(Service).filter(Service.name == s_data["name"]).first()
    if not existing:
        s = Service(**s_data)
        db.add(s)
        db.flush()
        service_map[s_data["name"]] = s.id
    else:
        service_map[s_data["name"]] = existing.id
db.commit()
print("✓ Servicios creados")

# Products
PRODUCTS = [
    {"name": "CERA BRILLO", "price": 15.0, "commission": 5.0},
    {"name": "MINOXIDIL", "price": 25.0, "commission": 8.0},
    {"name": "CHAMPU", "price": 10.0, "commission": 3.0},
    {"name": "FIJADOR", "price": 8.0, "commission": 2.5},
    {"name": "NADA", "price": 0.0, "commission": 0.0},
]
product_map = {}
for p_data in PRODUCTS:
    existing = db.query(Product).filter(Product.name == p_data["name"]).first()
    if not existing:
        p = Product(**p_data)
        db.add(p)
        db.flush()
        product_map[p_data["name"]] = p.id
    else:
        product_map[p_data["name"]] = existing.id
db.commit()
print("✓ Productos creados")

# Inventory items
INVENTORY = [
    ("COLA", "bebida"),
    ("POWER", "bebida"),
    ("AGUA", "bebida"),
    ("FUZETEA", "bebida"),
    ("CERVEZA", "bebida"),
    ("ENERGIZANTE", "bebida"),
    ("TOALLAS", "insumo"),
    ("CAPAS", "insumo"),
]
for name, cat in INVENTORY:
    if not db.query(InventoryItem).filter(InventoryItem.name == name).first():
        db.add(
            InventoryItem(name=name, category=cat, stock_current=20, low_stock_alert=5)
        )
db.commit()
print("✓ Inventario creado")


def parse_money(val: str) -> float:
    if not val:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", val)
    return float(cleaned) if cleaned else 0.0


def parse_date(val: str) -> date:
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(val.strip(), fmt).date()
        except ValueError:
            continue
    return date.today()


# Import CSV sales
csv_path = os.path.join(os.path.dirname(__file__), "..", "data_marzo.csv")
if os.path.exists(csv_path) and db.query(Sale).count() == 0:
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            if not row.get("FECHA") or not row.get("NOMBRE"):
                continue
            barber_name = (row.get("BARBERO") or "").strip().upper()
            barber_id = barber_map.get(barber_name)
            if not barber_id:
                continue
            service_name = (row.get("SERVICIO") or "").strip().upper()
            service_id = service_map.get(service_name)
            product_name = (row.get("PRODUCTO") or "NADA").strip().upper()
            product_id = product_map.get(product_name, product_map.get("NADA"))

            # Commission per barber column
            commission = 0.0
            if barber_name == "ELVIS":
                commission = parse_money(row.get("ELVIS", ""))
            elif barber_name == "MAY":
                commission = parse_money(row.get("MAY", ""))
            elif barber_name == "KEVIN":
                commission = parse_money(row.get("BARBERO 1", ""))
            elif barber_name == "JAVIER":
                commission = parse_money(row.get("BARBERO 2", ""))

            sale = Sale(
                date=parse_date(row["FECHA"]),
                client_name=(row.get("NOMBRE") or "").strip(),
                client_lastname=(row.get("APELLIDO") or "").strip(),
                contact=row.get("CONTACTO", "REGISTRADO"),
                barber_id=barber_id,
                service_id=service_id,
                service_value=parse_money(row.get("VALOR", "")),
                product_id=product_id,
                product_value=0.0,
                drink=(row.get("BEBIDA") or "NADA").strip(),
                total=parse_money(row.get("TOTAL", "")),
                bank_transfer=parse_money(row.get("TRANSFERENCIAS", "")),
                barber_commission=commission,
                status="completed",
            )
            db.add(sale)
            count += 1
        db.commit()
        print(f"✓ {count} ventas importadas desde CSV")

db.close()
print("\n✓ Seed completado exitosamente")
