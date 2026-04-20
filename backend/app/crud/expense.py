from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from ..models.expense import Expense
from ..models.sale import Sale
from ..schemas.expense import ExpenseCreate, ExpenseUpdate


def get_expenses(db: Session, date_from: date = None, date_to: date = None, category: str = None):
    q = db.query(Expense)
    if date_from:
        q = q.filter(Expense.date >= date_from)
    if date_to:
        q = q.filter(Expense.date <= date_to)
    if category:
        q = q.filter(Expense.category == category)
    return q.order_by(Expense.date.desc()).all()


def create_expense(db: Session, expense: ExpenseCreate):
    db_obj = Expense(**expense.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_expense(db: Session, expense_id: int, expense: ExpenseUpdate):
    db_obj = db.query(Expense).filter(Expense.id == expense_id).first()
    if not db_obj:
        return None
    for k, v in expense.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_expense(db: Session, expense_id: int):
    db_obj = db.query(Expense).filter(Expense.id == expense_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def get_accounting_dashboard(db: Session, date_from: date = None, date_to: date = None):
    sq = db.query(Sale)
    eq = db.query(Expense)
    if date_from:
        sq = sq.filter(Sale.date >= date_from)
        eq = eq.filter(Expense.date >= date_from)
    if date_to:
        sq = sq.filter(Sale.date <= date_to)
        eq = eq.filter(Expense.date <= date_to)

    sales = sq.all()
    service_income = sum(s.service_value for s in sales)
    product_income = sum(s.product_value for s in sales)
    transfer_income = sum(s.bank_transfer for s in sales)
    total_income = sum(s.total for s in sales)
    cash_income = total_income - transfer_income
    total_expenses = sum(e.amount for e in eq.all())
    net_profit = total_income - total_expenses

    return {
        "service_income": service_income,
        "product_income": product_income,
        "transfer_income": transfer_income,
        "cash_income": cash_income,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "period_label": f"{date_from or 'inicio'} - {date_to or 'hoy'}",
    }
