from sqlalchemy.orm import Session
from ..models.barber import Barber
from ..schemas.barber import BarberCreate, BarberUpdate


def get_barbers(db: Session, company_id: int, active_only: bool = False):
    q = db.query(Barber).filter(Barber.company_id == company_id)
    if active_only:
        q = q.filter(Barber.is_active == True)
    return q.order_by(Barber.name).all()


def get_barber(db: Session, company_id: int, barber_id: int):
    return db.query(Barber).filter(
        Barber.id == barber_id,
        Barber.company_id == company_id,
    ).first()


def create_barber(db: Session, company_id: int, barber: BarberCreate):
    db_obj = Barber(**barber.model_dump(), company_id=company_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_barber(db: Session, company_id: int, barber_id: int, barber: BarberUpdate):
    db_obj = get_barber(db, company_id, barber_id)
    if not db_obj:
        return None
    for k, v in barber.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj
