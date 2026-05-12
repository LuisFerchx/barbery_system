import secrets
import string
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from decimal import Decimal
from ..models.sale import Sale
from ..models.barber import Barber
from ..models.config import IncomeSplitConfig
from ..models.inventory import InventoryItem, InventoryMovement
from ..schemas.sale import SaleCreate


def generate_sale_number(db: Session) -> str:
    chars = string.ascii_uppercase + string.digits
    while True:
        suffix = "".join(secrets.choice(chars) for _ in range(6))
        number = f"CRT-{suffix}"
        if not db.query(Sale).filter(Sale.number == number).first():
            return number


def _get_split_config(db: Session) -> dict:
    rows = db.query(IncomeSplitConfig).all()
    return {row.name: row.percentage for row in rows}


def calculate_sale_financials(
    gross_total: Decimal,
    barber_commission_rate: Decimal,
    db: Session,
) -> dict:
    barber_commission = gross_total * barber_commission_rate
    real_income = gross_total - barber_commission
    split = _get_split_config(db)

    profit_pct = split.get("profit", Decimal("0.40"))
    owner_pct = split.get("owner_salary", Decimal("0.30"))
    taxes_pct = split.get("taxes", Decimal("0.20"))
    operating_pct = split.get("operating", Decimal("0.10"))

    return {
        "barber_commission_amount": barber_commission.quantize(Decimal("0.01")),
        "real_income": real_income.quantize(Decimal("0.01")),
        "split_profit": (real_income * profit_pct).quantize(Decimal("0.01")),
        "split_owner_salary": (real_income * owner_pct).quantize(Decimal("0.01")),
        "split_taxes": (real_income * taxes_pct).quantize(Decimal("0.01")),
        "split_operating": (real_income * operating_pct).quantize(Decimal("0.01")),
    }


def _deduct_courtesy_drink(sale_id: int, db: Session, item_id: Optional[int] = None) -> None:
    if item_id:
        item = (
            db.query(InventoryItem)
            .filter(
                InventoryItem.id == item_id,
                InventoryItem.category == "courtesy",
                InventoryItem.is_active == True,
            )
            .first()
        )
        if not item:
            raise ValueError("Bebida de cortesía seleccionada no encontrada o inactiva")
    else:
        item = (
            db.query(InventoryItem)
            .filter(
                InventoryItem.category == "courtesy",
                InventoryItem.is_active == True,
                InventoryItem.stock_current > 0,
            )
            .order_by(InventoryItem.stock_current.asc())
            .first()
        )
    if not item:
        return
    item.stock_current = max(Decimal("0"), item.stock_current - Decimal("1"))
    db.add(InventoryMovement(
        item_id=item.id,
        movement_type="out",
        quantity=Decimal("1"),
        reason=f"Cortesía por corte #{sale_id}",
        date=datetime.utcnow(),
        product_sale_id=None,
    ))


def get_sales(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    date_from: datetime = None,
    date_to: datetime = None,
    barber_id: int = None,
    client_id: int = None,
):
    q = db.query(Sale).options(
        joinedload(Sale.barber),
        joinedload(Sale.client),
        joinedload(Sale.service),
        joinedload(Sale.courtesy_drink_item),
    )
    if date_from:
        q = q.filter(Sale.date >= date_from)
    if date_to:
        q = q.filter(Sale.date <= date_to)
    if barber_id:
        q = q.filter(Sale.barber_id == barber_id)
    if client_id:
        q = q.filter(Sale.client_id == client_id)
    total = q.count()
    items = q.order_by(Sale.date.desc(), Sale.id.desc()).offset(skip).limit(limit).all()
    return total, items


def get_sale(db: Session, sale_id: int):
    return (
        db.query(Sale)
        .options(
            joinedload(Sale.barber),
            joinedload(Sale.client),
            joinedload(Sale.service),
            joinedload(Sale.courtesy_drink_item),
        )
        .filter(Sale.id == sale_id)
        .first()
    )


def create_sale(db: Session, sale_in: SaleCreate):
    barber = db.query(Barber).filter(Barber.id == sale_in.barber_id).first()
    if not barber:
        raise ValueError("Barbero no encontrado")

    financials = calculate_sale_financials(
        sale_in.gross_total, barber.commission_rate, db
    )
    number = generate_sale_number(db)

    db_obj = Sale(
        number=number,
        date=sale_in.date,
        client_id=sale_in.client_id,
        barber_id=sale_in.barber_id,
        service_id=sale_in.service_id,
        gross_total=sale_in.gross_total,
        payment_method=sale_in.payment_method,
        is_returning_client=sale_in.is_returning_client,
        courtesy_drink_given=sale_in.courtesy_drink_given,
        courtesy_drink_item_id=sale_in.courtesy_drink_item_id,
        cross_sell=sale_in.cross_sell,
        notes=sale_in.notes,
        **financials,
    )
    db.add(db_obj)
    db.flush()

    if sale_in.courtesy_drink_given:
        _deduct_courtesy_drink(db_obj.id, db, item_id=sale_in.courtesy_drink_item_id)

    db.commit()
    db.refresh(db_obj)
    return get_sale(db, db_obj.id)


def delete_sale(db: Session, sale_id: int):
    db_obj = db.query(Sale).filter(Sale.id == sale_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj
