from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ....database import get_db
from ....crud import client as crud
from ....schemas.client import ClientCreate, ClientUpdate, ClientOut
from ....security import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=List[ClientOut])
def list_clients(
    active_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    clients = crud.get_clients(db, active_only=active_only, search=search)
    result = []
    for c in clients:
        c_dict = {col: getattr(c, col) for col in ["id", "name", "lastname", "phone", "email", "notes", "identification_number", "is_active", "created_at"]}
        c_dict["total_sales"] = crud.get_client_sale_count(db, c.id)
        result.append(ClientOut(**c_dict))
    return result


@router.post("/", response_model=ClientOut)
def create_client(data: ClientCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.create_client(db, data)


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    obj = crud.get_client(db, client_id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    c_dict = {col: getattr(obj, col) for col in ["id", "name", "lastname", "phone", "email", "notes", "identification_number", "is_active", "created_at"]}
    c_dict["total_sales"] = crud.get_client_sale_count(db, obj.id)
    return ClientOut(**c_dict)


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    obj = crud.update_client(db, client_id, data)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    return obj


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.delete_client(db, client_id)
    if not obj:
        raise HTTPException(404, "Cliente no encontrado")
    return {"ok": True}
