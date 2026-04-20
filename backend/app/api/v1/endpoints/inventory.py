from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database import get_db
from ....schemas.inventory import InventoryItemCreate, InventoryItemUpdate, InventoryItemOut, MovementCreate, MovementOut
from ....crud.inventory import get_items, get_item, create_item, update_item, create_movement, get_movements, get_low_stock
from ....security import get_current_user

router = APIRouter()


@router.get("/", response_model=List[InventoryItemOut])
def list_items(category: Optional[str] = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_items(db, category)


@router.get("/low-stock", response_model=List[InventoryItemOut])
def low_stock(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_low_stock(db)


@router.post("/", response_model=InventoryItemOut)
def new_item(item: InventoryItemCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_item(db, item)


@router.put("/{item_id}", response_model=InventoryItemOut)
def edit_item(item_id: int, item: InventoryItemUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    i = update_item(db, item_id, item)
    if not i:
        raise HTTPException(404, "Item no encontrado")
    return i


@router.post("/{item_id}/movement", response_model=MovementOut)
def add_movement(item_id: int, movement: MovementCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    movement.item_id = item_id
    return create_movement(db, movement)


@router.get("/{item_id}/movements", response_model=List[MovementOut])
def item_movements(item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_movements(db, item_id)
