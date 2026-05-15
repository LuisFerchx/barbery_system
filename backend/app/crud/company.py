from sqlalchemy.orm import Session
from ..models.company import Company
from ..schemas.company import CompanyCreate, CompanyUpdate
from .config import seed_company_defaults


def get_companies(db: Session) -> list[Company]:
    return db.query(Company).order_by(Company.name).all()


def get_company(db: Session, company_id: int) -> Company | None:
    return db.query(Company).filter(Company.id == company_id).first()


def get_company_by_slug(db: Session, slug: str) -> Company | None:
    return db.query(Company).filter(Company.slug == slug).first()


def create_company(db: Session, data: CompanyCreate) -> Company:
    db_obj = Company(**data.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    seed_company_defaults(db, db_obj.id)
    return db_obj


def update_company(db: Session, company_id: int, data: CompanyUpdate) -> Company | None:
    db_obj = get_company(db, company_id)
    if not db_obj:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj
