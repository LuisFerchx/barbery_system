from sqlalchemy.orm import Session, selectinload
from ..models.barber import Barber
from ..models.service_type import ServiceType
from ..schemas.barber import BarberCreate, BarberUpdate


def get_barbers(db: Session, company_id: int, active_only: bool = False):
    q = db.query(Barber).options(selectinload(Barber.service_types)).filter(Barber.company_id == company_id)
    if active_only:
        q = q.filter(Barber.is_active == True)
    return q.order_by(Barber.name).all()


def get_barber(db: Session, company_id: int, barber_id: int):
    return db.query(Barber).options(selectinload(Barber.service_types)).filter(
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


def update_barber_service_types(db: Session, company_id: int, barber_id: int, service_type_ids: list[int]):
    db_obj = get_barber(db, company_id, barber_id)
    if not db_obj:
        return None
    types = db.query(ServiceType).filter(
        ServiceType.id.in_(service_type_ids),
        ServiceType.company_id == company_id,
    ).all()
    db_obj.service_types = types
    db.commit()
    db.refresh(db_obj)
    return db_obj
