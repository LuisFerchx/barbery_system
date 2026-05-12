from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.client import Client
from ..models.sale import Sale
from ..schemas.client import ClientCreate, ClientUpdate


def get_clients(db: Session, active_only: bool = False, search: str = None):
    q = db.query(Client)
    if active_only:
        q = q.filter(Client.is_active == True)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (Client.name.ilike(pattern)) |
            (Client.lastname.ilike(pattern)) |
            (Client.phone.ilike(pattern)) |
            (Client.identification_number.ilike(pattern))
        )
    return q.order_by(Client.name).all()


def get_client(db: Session, client_id: int):
    return db.query(Client).filter(Client.id == client_id).first()


def create_client(db: Session, client: ClientCreate):
    db_obj = Client(**client.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_client(db: Session, client_id: int, client: ClientUpdate):
    db_obj = get_client(db, client_id)
    if not db_obj:
        return None
    for k, v in client.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_client(db: Session, client_id: int):
    db_obj = get_client(db, client_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def get_client_sale_count(db: Session, client_id: int) -> int:
    return db.query(func.count(Sale.id)).filter(Sale.client_id == client_id).scalar() or 0
