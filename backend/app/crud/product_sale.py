from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from decimal import Decimal
from ..models.product_sale import ProductSale
from ..models.barber import Barber
from ..models.inventory import InventoryItem, InventoryMovement
from ..schemas.product_sale import ProductSaleCreate


def get_product_sales(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    date_from: datetime = None,
    date_to: datetime = None,
    barber_id: int = None,
    item_id: int = None,
):
    q = db.query(ProductSale).options(
        joinedload(ProductSale.barber),
        joinedload(ProductSale.item),
        joinedload(ProductSale.client),
    )
    if date_from:
        q = q.filter(ProductSale.date >= date_from)
    if date_to:
        q = q.filter(ProductSale.date <= date_to)
    if barber_id:
        q = q.filter(ProductSale.barber_id == barber_id)
    if item_id:
        q = q.filter(ProductSale.item_id == item_id)
    total = q.count()
    items = q.order_by(ProductSale.date.desc(), ProductSale.id.desc()).offset(skip).limit(limit).all()
    return total, items


def get_product_sale(db: Session, product_sale_id: int):
    return (
        db.query(ProductSale)
        .options(
            joinedload(ProductSale.barber),
            joinedload(ProductSale.item),
            joinedload(ProductSale.client),
        )
        .filter(ProductSale.id == product_sale_id)
        .first()
    )


def create_product_sale(db: Session, data: ProductSaleCreate):
    barber = db.query(Barber).filter(Barber.id == data.barber_id).first()
    if not barber:
        raise ValueError("Barbero no encontrado")

    item = db.query(InventoryItem).filter(InventoryItem.id == data.item_id).first()
    if not item:
        raise ValueError("Item de inventario no encontrado")

    subtotal = (data.quantity * data.unit_price).quantize(Decimal("0.01"))
    barber_commission = (subtotal * barber.commission_rate).quantize(Decimal("0.01"))

    db_obj = ProductSale(
        date=data.date,
        barber_id=data.barber_id,
        item_id=data.item_id,
        client_id=data.client_id,
        quantity=data.quantity,
        unit_price=data.unit_price,
        subtotal=subtotal,
        barber_commission_amount=barber_commission,
        payment_method=data.payment_method,
        notes=data.notes,
    )
    db.add(db_obj)
    db.flush()

    item.stock_current = max(Decimal("0"), item.stock_current - data.quantity)
    movement = InventoryMovement(
        item_id=data.item_id,
        movement_type="out",
        quantity=data.quantity,
        reason=f"Venta de producto #{db_obj.id}",
        date=data.date,
        product_sale_id=db_obj.id,
    )
    db.add(movement)
    db.commit()
    db.refresh(db_obj)
    return get_product_sale(db, db_obj.id)


def delete_product_sale(db: Session, product_sale_id: int):
    db_obj = db.query(ProductSale).filter(ProductSale.id == product_sale_id).first()
    if not db_obj:
        return None

    movement = db.query(InventoryMovement).filter(
        InventoryMovement.product_sale_id == product_sale_id
    ).first()
    if movement:
        item = db.query(InventoryItem).filter(InventoryItem.id == movement.item_id).first()
        if item:
            item.stock_current += movement.quantity
        db.delete(movement)

    db.delete(db_obj)
    db.commit()
    return db_obj
