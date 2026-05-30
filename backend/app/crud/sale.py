import secrets
import string
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from decimal import Decimal
from ..models.sale import Sale
from ..models.barber import Barber
from ..models.company import Company
from ..models.catalog import ServiceCatalog
from ..models.config import IncomeSplitConfig
from ..models.inventory import InventoryItem, InventoryMovement
from ..schemas.sale import SaleCreate, SaleUpdate


def generate_sale_number(db: Session) -> str:
    """
    Generate a unique sale number in the format CRT-XXXXXX where each X is an uppercase letter or digit.
    
    Returns:
        str: A unique sale number matching the pattern `CRT-XXXXXX` (6 random uppercase letters/digits) that does not collide with any existing Sale.number in the database.
    """
    chars = string.ascii_uppercase + string.digits
    while True:
        suffix = "".join(secrets.choice(chars) for _ in range(6))
        number = f"CRT-{suffix}"
        if not db.query(Sale).filter(Sale.number == number).first():
            return number


def _get_split_config(db: Session, company_id: int) -> dict:
    rows = db.query(IncomeSplitConfig).filter(
        IncomeSplitConfig.company_id == company_id
    ).all()
    return {row.name: row.percentage for row in rows}


def calculate_sale_financials(
    gross_total: Decimal,
    barber_commission_rate: Decimal,
    db: Session,
    company_id: int,
) -> dict:
    barber_commission = gross_total * barber_commission_rate
    real_income = gross_total - barber_commission
    split = _get_split_config(db, company_id)

    profit_pct = split.get("profit", Decimal("0.40"))
    owner_pct = split.get("owner_salary", Decimal("0.30"))
    taxes_pct = split.get("taxes", Decimal("0.20"))
    operating_pct = split.get("operating", Decimal("0.10"))

    return {
        "barber_commission_amount": barber_commission.quantize(Decimal("0.01")),
        "real_income": real_income.quantize(Decimal("0.01")),
        "split_profit": (real_income * profit_pct).quantize(Decimal("0.01")),
        "split_owner_salary": (real_income * owner_pct).quantize(Decimal("0.01")),
        "split_taxes": (real_income * taxes_pct).quantize(Decimal("0.01")),
        "split_operating": (real_income * operating_pct).quantize(Decimal("0.01")),
    }


def _deduct_courtesy_drink(
    sale_id: int,
    db: Session,
    company_id: int,
    item_id: Optional[int] = None,
) -> None:
    if item_id:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == item_id,
            InventoryItem.company_id == company_id,
            InventoryItem.category == "courtesy",
            InventoryItem.is_active == True,
        ).first()
        if not item:
            raise ValueError("Bebida de cortesía seleccionada no encontrada o inactiva")
    else:
        item = db.query(InventoryItem).filter(
            InventoryItem.company_id == company_id,
            InventoryItem.category == "courtesy",
            InventoryItem.is_active == True,
            InventoryItem.stock_current > 0,
        ).order_by(InventoryItem.stock_current.asc()).first()
    if not item:
        return
    item.stock_current = max(Decimal("0"), item.stock_current - Decimal("1"))
    db.add(InventoryMovement(
        item_id=item.id,
        movement_type="out",
        quantity=Decimal("1"),
        reason=f"Cortesía por corte #{sale_id}",
        date=datetime.utcnow(),
        product_sale_id=None,
    ))


def get_sales(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: int = 50,
    date_from: datetime = None,
    date_to: datetime = None,
    barber_id: int = None,
    client_id: int = None,
):
    q = db.query(Sale).options(
        joinedload(Sale.barber),
        joinedload(Sale.client),
        joinedload(Sale.service),
        joinedload(Sale.courtesy_drink_item),
    ).filter(Sale.company_id == company_id)
    if date_from:
        q = q.filter(Sale.date >= date_from)
    if date_to:
        q = q.filter(Sale.date <= date_to)
    if barber_id:
        q = q.filter(Sale.barber_id == barber_id)
    if client_id:
        q = q.filter(Sale.client_id == client_id)
    total = q.count()
    items = q.order_by(Sale.date.desc(), Sale.id.desc()).offset(skip).limit(limit).all()
    return total, items


def get_sale(db: Session, company_id: int, sale_id: int):
    return (
        db.query(Sale)
        .options(
            joinedload(Sale.barber),
            joinedload(Sale.client),
            joinedload(Sale.service),
            joinedload(Sale.courtesy_drink_item),
        )
        .filter(Sale.id == sale_id, Sale.company_id == company_id)
        .first()
    )


def create_sale(db: Session, company_id: int, sale_in: SaleCreate):
    barber = db.query(Barber).filter(
        Barber.id == sale_in.barber_id,
        Barber.company_id == company_id,
    ).first()
    if not barber:
        raise ValueError("Barbero no encontrado")

    effective_rate = barber.commission_rate
    if sale_in.service_id:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company and company.commission_by_service:
            service = db.query(ServiceCatalog).filter(
                ServiceCatalog.id == sale_in.service_id
            ).first()
            if service and service.commission_rate is not None:
                effective_rate = service.commission_rate

    financials = calculate_sale_financials(
        sale_in.gross_total, effective_rate, db, company_id
    )
    number = generate_sale_number(db)

    db_obj = Sale(
        company_id=company_id,
        number=number,
        date=sale_in.date,
        client_id=sale_in.client_id,
        barber_id=sale_in.barber_id,
        service_id=sale_in.service_id,
        gross_total=sale_in.gross_total,
        payment_method=sale_in.payment_method,
        is_returning_client=sale_in.is_returning_client,
        courtesy_drink_given=sale_in.courtesy_drink_given,
        courtesy_drink_item_id=sale_in.courtesy_drink_item_id,
        cross_sell=sale_in.cross_sell,
        notes=sale_in.notes,
        **financials,
    )
    db.add(db_obj)
    db.flush()

    if sale_in.courtesy_drink_given:
        _deduct_courtesy_drink(db_obj.id, db, company_id, item_id=sale_in.courtesy_drink_item_id)

    db.commit()
    db.refresh(db_obj)
    return get_sale(db, company_id, db_obj.id)


def delete_sale(db: Session, company_id: int, sale_id: int):
    """
    Delete a sale record for a given company and sale ID.
    
    Parameters:
        db (Session): Database session.
        company_id (int): ID of the company that must own the sale.
        sale_id (int): ID of the sale to delete.
    
    Returns:
        Sale | None: The deleted Sale ORM object if it existed and was removed, otherwise `None`.
    """
    db_obj = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id,
    ).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj


def _restore_courtesy_drink_stock(db: Session, company_id: int, item_id: int, sale_id: int):
    """
    Restore one unit to a courtesy inventory item's stock and record an incoming inventory movement.
    
    Parameters:
        company_id (int): ID of the company that owns the inventory item.
        item_id (int): ID of the inventory item to restore.
        sale_id (int): ID of the sale that triggered the restoration; used in the movement reason.
    
    Description:
        If an active inventory item matching `item_id` and `company_id` is found, increments its `stock_current` by 1
        and creates an `InventoryMovement` with movement_type "in", quantity 1, a reason referencing `sale_id`, the
        current UTC date, and no associated `product_sale_id`. If no matching item exists, the function does nothing.
    """
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.company_id == company_id,
    ).first()
    if item:
        item.stock_current = item.stock_current + Decimal("1")
        db.add(InventoryMovement(
            item_id=item.id,
            movement_type="in",
            quantity=Decimal("1"),
            reason=f"Restauración por modificación de cortesía en corte #{sale_id}",
            date=datetime.utcnow(),
            product_sale_id=None,
        ))


def update_sale(db: Session, company_id: int, sale_id: int, sale_in: SaleUpdate) -> Optional[Sale]:
    """
    Update an existing Sale and adjust courtesy-drink inventory when its courtesy fields change.
    
    Updates mutable sale fields (payment_method, is_returning_client, notes, courtesy_drink_given, courtesy_drink_item_id). If the courtesy drink is enabled or the selected courtesy item changes, restores stock for the previously selected item when applicable and deducts stock for the current item; if the courtesy drink is disabled, restores stock for the previously selected item and clears the stored courtesy item. Commits the changes and returns the refreshed Sale.
    
    Returns:
        The updated `Sale` instance if the sale was found and updated, or `None` if no matching sale exists.
    """
    db_obj = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id,
    ).first()
    if not db_obj:
        return None

    old_drink_given = db_obj.courtesy_drink_given
    old_drink_item_id = db_obj.courtesy_drink_item_id

    # Actualizar campos directos
    if sale_in.payment_method is not None:
        db_obj.payment_method = sale_in.payment_method
    if sale_in.is_returning_client is not None:
        db_obj.is_returning_client = sale_in.is_returning_client
    if sale_in.notes is not None:
        db_obj.notes = sale_in.notes

    # Control y validaciones de bebida de cortesía
    if sale_in.courtesy_drink_given is not None:
        db_obj.courtesy_drink_given = sale_in.courtesy_drink_given
    if sale_in.courtesy_drink_item_id is not None:
        db_obj.courtesy_drink_item_id = sale_in.courtesy_drink_item_id

    # Aplicar movimientos de inventario según el cambio
    if db_obj.courtesy_drink_given:
        # Caso A: Se activó ahora o se cambió la bebida seleccionada
        if not old_drink_given or (sale_in.courtesy_drink_item_id is not None and old_drink_item_id != db_obj.courtesy_drink_item_id):
            if old_drink_given and old_drink_item_id:
                _restore_courtesy_drink_stock(db, company_id, old_drink_item_id, sale_id)
            
            _deduct_courtesy_drink(db_obj.id, db, company_id, item_id=db_obj.courtesy_drink_item_id)
    else:
        # Caso B: Se desactivó la bebida
        if old_drink_given and old_drink_item_id:
            _restore_courtesy_drink_stock(db, company_id, old_drink_item_id, sale_id)
        db_obj.courtesy_drink_item_id = None

    db.commit()
    db.refresh(db_obj)
    return get_sale(db, company_id, db_obj.id)
