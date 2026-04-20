from sqlalchemy.orm import Session
from datetime import date
from ..models.debt import Debt, DebtPayment
from ..schemas.debt import DebtCreate, DebtUpdate, DebtPaymentCreate


def get_debts(db: Session, status: str = None, client_name: str = None):
    q = db.query(Debt)
    if status:
        q = q.filter(Debt.status == status)
    if client_name:
        q = q.filter(Debt.client_name.ilike(f"%{client_name}%"))
    return q.order_by(Debt.date.desc()).all()


def get_debt(db: Session, debt_id: int):
    return db.query(Debt).filter(Debt.id == debt_id).first()


def create_debt(db: Session, debt: DebtCreate):
    data = debt.model_dump()
    data["pending_amount"] = data["original_amount"]
    db_obj = Debt(**data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_debt(db: Session, debt_id: int, debt: DebtUpdate):
    db_obj = get_debt(db, debt_id)
    if not db_obj:
        return None
    for k, v in debt.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def register_payment(db: Session, debt_id: int, payment: DebtPaymentCreate):
    debt = get_debt(db, debt_id)
    if not debt:
        return None
    db_payment = DebtPayment(debt_id=debt_id, **payment.model_dump())
    debt.paid_amount += payment.amount
    debt.pending_amount = max(0, debt.original_amount - debt.paid_amount)
    if debt.pending_amount == 0:
        debt.status = "pagado"
    elif debt.paid_amount > 0:
        debt.status = "parcial"
    db.add(db_payment)
    db.commit()
    db.refresh(debt)
    return debt
