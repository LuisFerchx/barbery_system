from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import datetime
from ..models.sale import Sale
from ..models.product_sale import ProductSale
from ..models.expense import Expense
from ..models.inventory import InventoryItem
from ..models.barber import Barber
from ..models.config import IncomeSplitConfig


def _month_bounds(month: str):
    year, m = int(month.split("-")[0]), int(month.split("-")[1])
    from calendar import monthrange
    _, last_day = monthrange(year, m)
    start = datetime(year, m, 1)
    end = datetime(year, m, last_day, 23, 59, 59)
    return start, end


def get_dashboard_summary(db: Session, month: str) -> dict:
    start, end = _month_bounds(month)

    sales = db.query(Sale).filter(Sale.date >= start, Sale.date <= end).all()
    product_sales = db.query(ProductSale).filter(ProductSale.date >= start, ProductSale.date <= end).all()
    expenses = db.query(Expense).filter(Expense.date >= start, Expense.date <= end).all()

    service_gross = sum((s.gross_total for s in sales), Decimal("0"))
    product_gross = sum((ps.subtotal for ps in product_sales), Decimal("0"))
    gross_income = service_gross + product_gross

    service_commission = sum((s.barber_commission_amount for s in sales), Decimal("0"))
    product_commission = sum((ps.barber_commission_amount for ps in product_sales), Decimal("0"))
    barber_commissions_total = service_commission + product_commission

    service_real = sum((s.real_income for s in sales), Decimal("0"))
    product_real = product_gross - product_commission
    real_income_total = service_real + product_real

    total_expenses = sum((e.amount for e in expenses), Decimal("0"))
    operating_profit = real_income_total - total_expenses

    split_taxes = sum((s.split_taxes for s in sales), Decimal("0"))
    taxes_reserved = split_taxes
    net_profit = operating_profit - taxes_reserved

    split_config = {row.name: row.percentage for row in db.query(IncomeSplitConfig).all()}

    split_breakdown = {
        "profit": (real_income_total * split_config.get("profit", Decimal("0.40"))).quantize(Decimal("0.01")),
        "owner_salary": (real_income_total * split_config.get("owner_salary", Decimal("0.30"))).quantize(Decimal("0.01")),
        "taxes": (real_income_total * split_config.get("taxes", Decimal("0.20"))).quantize(Decimal("0.01")),
        "operating": (real_income_total * split_config.get("operating", Decimal("0.10"))).quantize(Decimal("0.01")),
    }

    alerts = db.query(InventoryItem).filter(
        InventoryItem.is_active == True,
        InventoryItem.stock_current <= InventoryItem.stock_minimum,
    ).all()
    inventory_alerts = [
        {
            "item_id": a.id,
            "name": a.name,
            "category": a.category,
            "stock_current": a.stock_current,
            "stock_minimum": a.stock_minimum,
        }
        for a in alerts
    ]

    barbers = db.query(Barber).filter(Barber.is_active == True).all()
    top_barbers = []
    for b in barbers:
        b_service_real = sum((s.real_income for s in sales if s.barber_id == b.id), Decimal("0"))
        b_product_real = sum(
            ((ps.subtotal - ps.barber_commission_amount) for ps in product_sales if ps.barber_id == b.id),
            Decimal("0"),
        )
        top_barbers.append({
            "barber_id": b.id,
            "name": b.name,
            "lastname": b.lastname,
            "total_real_income": b_service_real.quantize(Decimal("0.01")),
            "total_sales": sum(1 for s in sales if s.barber_id == b.id),
        })
    top_barbers.sort(key=lambda x: x["total_real_income"], reverse=True)

    return {
        "month": month,
        "gross_income": gross_income.quantize(Decimal("0.01")),
        "service_gross_income": service_gross.quantize(Decimal("0.01")),
        "product_gross_income": product_gross.quantize(Decimal("0.01")),
        "barber_commissions_total": barber_commissions_total.quantize(Decimal("0.01")),
        "real_income_total": real_income_total.quantize(Decimal("0.01")),
        "total_expenses": total_expenses.quantize(Decimal("0.01")),
        "operating_profit": operating_profit.quantize(Decimal("0.01")),
        "taxes_reserved": taxes_reserved.quantize(Decimal("0.01")),
        "net_profit": net_profit.quantize(Decimal("0.01")),
        "split_breakdown": split_breakdown,
        "inventory_alerts": inventory_alerts,
        "top_barbers": top_barbers,
    }
