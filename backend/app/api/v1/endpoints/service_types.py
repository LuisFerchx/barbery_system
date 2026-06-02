from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import service_type as crud
from ....schemas.service_type import ServiceTypeCreate, ServiceTypeUpdate, ServiceTypeOut
from ....security import get_current_user, require_admin, get_company_id

router = APIRouter()


@router.get("/", response_model=List[ServiceTypeOut])
def list_service_types(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    return crud.get_service_types(db, company_id, active_only=active_only)


@router.post("/", response_model=ServiceTypeOut)
def create_service_type(
    data: ServiceTypeCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    return crud.create_service_type(db, company_id, data)


@router.put("/{service_type_id}/", response_model=ServiceTypeOut)
def update_service_type(
    service_type_id: int,
    data: ServiceTypeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.update_service_type(db, company_id, service_type_id, data)
    if not obj:
        raise HTTPException(404, "Tipo de servicio no encontrado")
    return obj


@router.delete("/{service_type_id}/", response_model=ServiceTypeOut)
def delete_service_type(
    service_type_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    company_id: int = Depends(get_company_id),
):
    obj = crud.delete_service_type(db, company_id, service_type_id)
    if not obj:
        raise HTTPException(404, "Tipo de servicio no encontrado")
    return obj
