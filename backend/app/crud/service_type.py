from sqlalchemy.orm import Session
from ..models.service_type import ServiceType
from ..schemas.service_type import ServiceTypeCreate, ServiceTypeUpdate


def get_service_types(db: Session, company_id: int, active_only: bool = False):
    q = db.query(ServiceType).filter(ServiceType.company_id == company_id)
    if active_only:
        q = q.filter(ServiceType.is_active == True)
    return q.order_by(ServiceType.name).all()


def get_service_type(db: Session, company_id: int, service_type_id: int):
    return db.query(ServiceType).filter(
        ServiceType.id == service_type_id,
        ServiceType.company_id == company_id,
    ).first()


def create_service_type(db: Session, company_id: int, data: ServiceTypeCreate):
    db_obj = ServiceType(**data.model_dump(), company_id=company_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_service_type(db: Session, company_id: int, service_type_id: int, data: ServiceTypeUpdate):
    db_obj = get_service_type(db, company_id, service_type_id)
    if not db_obj:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_service_type(db: Session, company_id: int, service_type_id: int):
    db_obj = get_service_type(db, company_id, service_type_id)
    if db_obj:
        db_obj.is_active = False
        db.commit()
        db.refresh(db_obj)
    return db_obj
