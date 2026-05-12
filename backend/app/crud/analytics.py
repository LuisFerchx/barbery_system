from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
from decimal import Decimal
from ..models.sale import Sale
from ..models.product_sale import ProductSale
from ..models.barber import Barber
from ..models.inventory import InventoryItem, InventoryMovement


def _month_bounds(month: str):
    year, m = int(month.split("-")[0]), int(month.split("-")[1])
    from calendar import monthrange
    _, last_day = monthrange(year, m)
    start = datetime(year, m, 1)
    end = datetime(year, m, last_day, 23, 59, 59)
    return start, end


def get_client_metrics(db: Session, month: str) -> dict:
    start, end = _month_bounds(month)
    sales = db.query(Sale).filter(Sale.date >= start, Sale.date <= end).all()
    new_clients = sum(1 for s in sales if not s.is_returning_client)
    returning_clients = sum(1 for s in sales if s.is_returning_client)
    total = new_clients + returning_clients
    retention_rate = Decimal(returning_clients) / Decimal(total) if total > 0 else Decimal("0")
    return {
        "month": month,
        "new_clients": new_clients,
        "returning_clients": returning_clients,
        "total_clients": total,
        "retention_rate": retention_rate.quantize(Decimal("0.0001")),
    }


def get_cross_sell_metrics(db: Session, month: str) -> dict:
    start, end = _month_bounds(month)

    sales = db.query(Sale).filter(Sale.date >= start, Sale.date <= end).all()
    product_sales = db.query(ProductSale).filter(
        ProductSale.date >= start, ProductSale.date <= end
    ).all()

    total_services = len(sales)
    cross_sell_count = sum(1 for s in sales if s.cross_sell)
    overall_rate = (
        Decimal(cross_sell_count) / Decimal(total_services)
        if total_services > 0
        else Decimal("0")
    )

    barbers = db.query(Barber).filter(Barber.is_active == True).all()
    by_barber = []
    for barber in barbers:
        barber_sales = [s for s in sales if s.barber_id == barber.id]
        barber_product_sales = [ps for ps in product_sales if ps.barber_id == barber.id]
        total_b = len(barber_sales)
        product_count_b = len(barber_product_sales)
        rate_b = Decimal(product_count_b) / Decimal(total_b) if total_b > 0 else Decimal("0")
        by_barber.append({
            "barber_id": barber.id,
            "name": barber.name,
            "lastname": barber.lastname,
            "total_services": total_b,
            "product_sales_count": product_count_b,
            "cross_sell_rate": rate_b.quantize(Decimal("0.0001")),
        })

    return {
        "month": month,
        "total_services": total_services,
        "cross_sell_count": cross_sell_count,
        "overall_rate": overall_rate.quantize(Decimal("0.0001")),
        "by_barber": by_barber,
    }


def get_top_courtesy_drinks(db: Session, month: str) -> dict:
    start, end = _month_bounds(month)
    rows = (
        db.query(InventoryMovement.item_id, InventoryItem.name, func.count().label("count"))
        .join(InventoryItem, InventoryMovement.item_id == InventoryItem.id)
        .filter(
            InventoryItem.category == "courtesy",
            InventoryMovement.movement_type == "out",
            InventoryMovement.reason.like("Cortesía por corte #%"),
            InventoryMovement.date >= start,
            InventoryMovement.date <= end,
        )
        .group_by(InventoryMovement.item_id, InventoryItem.name)
        .order_by(func.count().desc())
        .limit(5)
        .all()
    )
    return {
        "month": month,
        "top_drinks": [
            {"item_id": r.item_id, "name": r.name, "count": r.count}
            for r in rows
        ],
    }
