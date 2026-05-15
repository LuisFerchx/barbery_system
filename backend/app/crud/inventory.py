from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from decimal import Decimal
from ..models.inventory import InventoryItem, InventoryMovement
from ..schemas.inventory import InventoryItemCreate, InventoryItemUpdate, MovementCreate


def get_items(db: Session, company_id: int, category: str = None, active_only: bool = True):
    q = db.query(InventoryItem).filter(InventoryItem.company_id == company_id)
    if active_only:
        q = q.filter(InventoryItem.is_active == True)
    if category:
        q = q.filter(InventoryItem.category == category)
    return q.order_by(InventoryItem.name).all()


def get_item(db: Session, company_id: int, item_id: int):
    return db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.company_id == company_id,
    ).first()


def create_item(db: Session, company_id: int, item: InventoryItemCreate):
    db_obj = InventoryItem(**item.model_dump(), company_id=company_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_item(db: Session, company_id: int, item_id: int, item: InventoryItemUpdate):
    db_obj = get_item(db, company_id, item_id)
    if not db_obj:
        return None
    for k, v in item.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def create_movement(db: Session, company_id: int, movement: MovementCreate):
    item = get_item(db, company_id, movement.item_id)
    if not item:
        raise ValueError("Item de inventario no encontrado")

    date = movement.date or datetime.utcnow()
    db_obj = InventoryMovement(
        item_id=movement.item_id,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        reason=movement.reason,
        date=date,
        product_sale_id=None,
    )

    if movement.movement_type == "in":
        item.stock_current += movement.quantity
    elif movement.movement_type == "out":
        item.stock_current = max(Decimal("0"), item.stock_current - movement.quantity)
    elif movement.movement_type == "adjustment":
        item.stock_current = movement.quantity

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_movements(db: Session, company_id: int, item_id: int = None, limit: int = 100):
    q = (
        db.query(InventoryMovement)
        .join(InventoryItem, InventoryMovement.item_id == InventoryItem.id)
        .filter(InventoryItem.company_id == company_id)
    )
    if item_id:
        q = q.filter(InventoryMovement.item_id == item_id)
    return q.order_by(InventoryMovement.date.desc()).limit(limit).all()


def get_low_stock(db: Session, company_id: int):
    return db.query(InventoryItem).filter(
        InventoryItem.company_id == company_id,
        InventoryItem.is_active == True,
        InventoryItem.stock_current <= InventoryItem.stock_minimum,
    ).all()
