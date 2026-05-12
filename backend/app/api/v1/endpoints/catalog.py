from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....crud import catalog as crud
from ....schemas.catalog import ServiceCreate, ServiceUpdate, ServiceOut, ProductCreate, ProductUpdate, ProductOut
from ....security import get_current_user, require_admin

router = APIRouter()


@router.get("/services", response_model=List[ServiceOut])
def list_services(active_only: bool = False, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.get_services(db, active_only=active_only)


@router.post("/services", response_model=ServiceOut)
def create_service(data: ServiceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_service(db, data)


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, data: ServiceUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.update_service(db, service_id, data)
    if not obj:
        raise HTTPException(404, "Servicio no encontrado")
    return obj


@router.delete("/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.delete_service(db, service_id)
    if not obj:
        raise HTTPException(404, "Servicio no encontrado")
    return {"ok": True}


@router.get("/products", response_model=List[ProductOut])
def list_products(active_only: bool = False, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.get_products(db, active_only=active_only)


@router.post("/products", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_product(db, data)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.update_product(db, product_id, data)
    if not obj:
        raise HTTPException(404, "Producto no encontrado")
    return obj


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = crud.delete_product(db, product_id)
    if not obj:
        raise HTTPException(404, "Producto no encontrado")
    return {"ok": True}
