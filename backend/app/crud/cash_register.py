from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import datetime, timezone

from ..models.cash_register import CashRegisterClosing
from ..models.sale import Sale
from ..models.product_sale import ProductSale
from ..models.expense import Expense
from ..schemas.cash_register import CashRegisterCloseIn


def get_cash_summary(db: Session, company_id: int) -> dict:
    # period_from = last closing or beginning of today
    last = (
        db.query(func.max(CashRegisterClosing.closed_at))
        .filter(CashRegisterClosing.company_id == company_id)
        .scalar()
    )
    now = datetime.now(timezone.utc)
    if last is None:
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_from = today
    else:
        period_from = last

    sales_cash = (
        db.query(func.coalesce(func.sum(Sale.gross_total), 0))
        .filter(
            Sale.company_id == company_id,
            Sale.payment_method == "cash",
            Sale.date > period_from,
            Sale.date <= now,
        )
        .scalar()
    )
    product_sales_cash = (
        db.query(func.coalesce(func.sum(ProductSale.subtotal), 0))
        .filter(
            ProductSale.company_id == company_id,
            ProductSale.payment_method == "cash",
            ProductSale.date > period_from,
            ProductSale.date <= now,
        )
        .scalar()
    )
    expenses_cash = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.company_id == company_id,
            Expense.payment_method == "cash",
            Expense.date > period_from,
            Expense.date <= now,
        )
        .scalar()
    )

    sales_cash = Decimal(str(sales_cash))
    product_sales_cash = Decimal(str(product_sales_cash))
    expenses_cash = Decimal(str(expenses_cash))
    expected_cash = sales_cash + product_sales_cash - expenses_cash

    return {
        "period_from": period_from,
        "period_to": now,
        "sales_cash": sales_cash.quantize(Decimal("0.01")),
        "product_sales_cash": product_sales_cash.quantize(Decimal("0.01")),
        "expenses_cash": expenses_cash.quantize(Decimal("0.01")),
        "expected_cash": expected_cash.quantize(Decimal("0.01")),
    }


def create_closing(
    db: Session,
    company_id: int,
    user_id: int,
    data: CashRegisterCloseIn,
) -> CashRegisterClosing:
    summary = get_cash_summary(db, company_id)
    actual = Decimal(str(data.actual_cash))
    discrepancy = (actual - summary["expected_cash"]).quantize(Decimal("0.01"))

    closing = CashRegisterClosing(
        company_id=company_id,
        closed_by_user_id=user_id,
        period_from=summary["period_from"],
        period_to=summary["period_to"],
        sales_cash=summary["sales_cash"],
        product_sales_cash=summary["product_sales_cash"],
        expenses_cash=summary["expenses_cash"],
        expected_cash=summary["expected_cash"],
        actual_cash=actual.quantize(Decimal("0.01")),
        discrepancy=discrepancy,
        notes=data.notes,
    )
    db.add(closing)
    db.commit()
    db.refresh(closing)
    return closing


def get_closings(db: Session, company_id: int, limit: int = 20) -> list:
    return (
        db.query(CashRegisterClosing)
        .filter(CashRegisterClosing.company_id == company_id)
        .order_by(CashRegisterClosing.closed_at.desc())
        .limit(limit)
        .all()
    )
