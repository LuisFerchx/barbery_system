from sqlalchemy.orm import Session
from ..models.catalog import ServiceCatalog, ProductCatalog
from ..schemas.catalog import ServiceCreate, ServiceUpdate, ProductCreate, ProductUpdate


def get_services(db: Session, active_only: bool = False):
    q = db.query(ServiceCatalog)
    if active_only:
        q = q.filter(ServiceCatalog.is_active == True)
    return q.order_by(ServiceCatalog.name).all()


def get_service(db: Session, service_id: int):
    return db.query(ServiceCatalog).filter(ServiceCatalog.id == service_id).first()


def create_service(db: Session, service: ServiceCreate):
    db_obj = ServiceCatalog(**service.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_service(db: Session, service_id: int, service: ServiceUpdate):
    db_obj = get_service(db, service_id)
    if not db_obj:
        return None
    for k, v in service.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_service(db: Session, service_id: int):
    db_obj = get_service(db, service_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def get_products(db: Session, active_only: bool = False):
    q = db.query(ProductCatalog)
    if active_only:
        q = q.filter(ProductCatalog.is_active == True)
    return q.order_by(ProductCatalog.name).all()


def get_product(db: Session, product_id: int):
    return db.query(ProductCatalog).filter(ProductCatalog.id == product_id).first()


def create_product(db: Session, product: ProductCreate):
    db_obj = ProductCatalog(**product.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_product(db: Session, product_id: int, product: ProductUpdate):
    db_obj = get_product(db, product_id)
    if not db_obj:
        return None
    for k, v in product.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_product(db: Session, product_id: int):
    db_obj = get_product(db, product_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj
