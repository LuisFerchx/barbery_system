from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import date
from ..models.sale import Sale
from ..models.barber import Barber
from ..models.service import Service, Product
from ..schemas.sale import SaleCreate, SaleUpdate


def get_sales(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    date_from: date = None,
    date_to: date = None,
    barber_id: int = None,
    client_name: str = None,
):
    q = db.query(Sale).options(
        joinedload(Sale.barber),
        joinedload(Sale.service),
        joinedload(Sale.product),
    )
    if date_from:
        q = q.filter(Sale.date >= date_from)
    if date_to:
        q = q.filter(Sale.date <= date_to)
    if barber_id:
        q = q.filter(Sale.barber_id == barber_id)
    if client_name:
        q = q.filter(Sale.client_name.ilike(f"%{client_name}%"))
    total = q.count()
    items = q.order_by(Sale.date.desc(), Sale.id.desc()).offset(skip).limit(limit).all()
    return total, items


def get_sale(db: Session, sale_id: int):
    return db.query(Sale).options(
        joinedload(Sale.barber),
        joinedload(Sale.service),
        joinedload(Sale.product),
    ).filter(Sale.id == sale_id).first()


def create_sale(db: Session, sale: SaleCreate):
    db_obj = Sale(**sale.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_sale(db: Session, sale_id: int, sale: SaleUpdate):
    db_obj = db.query(Sale).filter(Sale.id == sale_id).first()
    if not db_obj:
        return None
    for k, v in sale.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_sale(db: Session, sale_id: int):
    db_obj = db.query(Sale).filter(Sale.id == sale_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def get_daily_summary(db: Session, target_date: date):
    sales = db.query(Sale).filter(Sale.date == target_date).all()
    return {
        "date": target_date,
        "total_sales": len(sales),
        "total_income": sum(s.total for s in sales),
        "cash_income": sum(s.total - s.bank_transfer for s in sales),
        "transfer_income": sum(s.bank_transfer for s in sales),
        "service_income": sum(s.service_value for s in sales),
        "product_income": sum(s.product_value for s in sales),
    }
