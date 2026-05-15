from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database import get_db
from ....crud import inventory as crud
from ....schemas.inventory import InventoryItemCreate, InventoryItemUpdate, InventoryItemOut, MovementCreate, MovementOut
from ....security import get_current_user, require_admin, get_company_id

router = APIRouter()


@router.get("/", response_model=List[InventoryItemOut])
def list_items(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_items(db, company_id, category=category)


@router.get("/low-stock", response_model=List[InventoryItemOut])
def low_stock(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_low_stock(db, company_id)


@router.post("/", response_model=InventoryItemOut)
def create_item(
    data: InventoryItemCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.create_item(db, company_id, data)


@router.put("/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    data: InventoryItemUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_item(db, company_id, item_id, data)
    if not obj:
        raise HTTPException(404, "Item no encontrado")
    return obj


@router.post("/{item_id}/movement", response_model=MovementOut)
def add_movement(
    item_id: int,
    data: MovementCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    data.item_id = item_id
    try:
        return crud.create_movement(db, company_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{item_id}/movements", response_model=List[MovementOut])
def get_movements(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_movements(db, company_id, item_id=item_id)
