from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database import get_db
from ....crud import manual as crud
from ....schemas.manual import ManualEntryCreate, ManualEntryUpdate, ManualEntryOut
from ....security import get_current_user, require_admin

router = APIRouter()


@router.get("/entries", response_model=List[ManualEntryOut])
def list_entries(
    section: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return crud.get_entries(db, section=section)


@router.post("/entries", response_model=ManualEntryOut)
def create_entry(data: ManualEntryCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_entry(db, data)


@router.put("/entries/{entry_id}", response_model=ManualEntryOut)
def update_entry(entry_id: int, data: ManualEntryUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.update_entry(db, entry_id, data)
    if not obj:
        raise HTTPException(404, "Entrada no encontrada")
    return obj


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.delete_entry(db, entry_id)
    if not obj:
        raise HTTPException(404, "Entrada no encontrada")
    return {"ok": True}
