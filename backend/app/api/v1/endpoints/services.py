from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....database import get_db
from ....schemas.service import ServiceCreate, ServiceUpdate, ServiceOut, ProductCreate, ProductUpdate, ProductOut
from ....crud.service import (
    get_services, get_service, create_service, update_service, delete_service,
    get_products, get_product, create_product, update_product, delete_product
)
from ....security import get_current_user

router = APIRouter()


@router.get("/services", response_model=List[ServiceOut])
def list_services(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_services(db)


@router.post("/services", response_model=ServiceOut)
def new_service(service: ServiceCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_service(db, service)


@router.put("/services/{sid}", response_model=ServiceOut)
def edit_service(sid: int, service: ServiceUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = update_service(db, sid, service)
    if not s:
        raise HTTPException(404, "Servicio no encontrado")
    return s


@router.delete("/services/{sid}")
def remove_service(sid: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    delete_service(db, sid)
    return {"ok": True}


@router.get("/products", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return get_products(db)


@router.post("/products", response_model=ProductOut)
def new_product(product: ProductCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return create_product(db, product)


@router.put("/products/{pid}", response_model=ProductOut)
def edit_product(pid: int, product: ProductUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = update_product(db, pid, product)
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    return p


@router.delete("/products/{pid}")
def remove_product(pid: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    delete_product(db, pid)
    return {"ok": True}
