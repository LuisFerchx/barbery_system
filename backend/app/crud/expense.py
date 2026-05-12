from sqlalchemy.orm import Session
from datetime import datetime
from ..models.expense import Expense
from ..schemas.expense import ExpenseCreate, ExpenseUpdate


def get_expenses(db: Session, date_from: datetime = None, date_to: datetime = None, category: str = None):
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
