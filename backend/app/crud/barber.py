from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from ..models.barber import Barber, Advance, BankTransfer
from ..models.sale import Sale
from ..schemas.barber import BarberCreate, BarberUpdate, AdvanceCreate, BankTransferCreate


def get_barbers(db: Session, active_only: bool = True):
    q = db.query(Barber)
    if active_only:
        q = q.filter(Barber.is_active == True)
    return q.all()


def get_barber(db: Session, barber_id: int):
    return db.query(Barber).filter(Barber.id == barber_id).first()


def create_barber(db: Session, barber: BarberCreate):
    db_obj = Barber(**barber.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_barber(db: Session, barber_id: int, barber: BarberUpdate):
    db_obj = get_barber(db, barber_id)
    if not db_obj:
        return None
    for k, v in barber.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_barber_dashboard(db: Session, barber_id: int, date_from: date = None, date_to: date = None):
    barber = get_barber(db, barber_id)
    if not barber:
        return None
    q = db.query(Sale).filter(Sale.barber_id == barber_id)
    if date_from:
        q = q.filter(Sale.date >= date_from)
    if date_to:
        q = q.filter(Sale.date <= date_to)
    sales = q.all()
    total_sales = sum(s.total for s in sales)
    total_commissions = sum(s.barber_commission for s in sales)
    advances = db.query(func.sum(Advance.amount)).filter(Advance.barber_id == barber_id).scalar() or 0.0
    transfers = db.query(func.sum(BankTransfer.amount)).filter(BankTransfer.barber_id == barber_id).scalar() or 0.0
    return {
        "barber": barber,
        "total_clients": len(sales),
        "total_sales": total_sales,
        "total_commissions": total_commissions,
        "total_advances": advances,
        "net_balance": total_commissions - advances,
        "total_bank_transfers": transfers,
    }


def create_advance(db: Session, advance: AdvanceCreate):
    db_obj = Advance(**advance.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_advances(db: Session, barber_id: int = None):
    q = db.query(Advance)
    if barber_id:
        q = q.filter(Advance.barber_id == barber_id)
    return q.order_by(Advance.date.desc()).all()


def create_bank_transfer(db: Session, transfer: BankTransferCreate):
    db_obj = BankTransfer(**transfer.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_bank_transfers(db: Session, barber_id: int = None):
    q = db.query(BankTransfer)
    if barber_id:
        q = q.filter(BankTransfer.barber_id == barber_id)
    return q.order_by(BankTransfer.date.desc()).all()
