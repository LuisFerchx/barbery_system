from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from math import ceil
from ....database import get_db
from ....crud import product_sale as crud
from ....schemas.product_sale import ProductSaleCreate, ProductSaleOut, ProductSaleListOut
from ....security import get_current_user, get_company_id

router = APIRouter()


def _enrich(ps) -> dict:
    d = {c.name: getattr(ps, c.name) for c in ps.__table__.columns}
    d["barber_name"] = f"{ps.barber.name} {ps.barber.lastname}" if ps.barber else None
    d["item_name"] = ps.item.name if ps.item else None
    d["client_name"] = f"{ps.client.name} {ps.client.lastname}" if ps.client else None
    return d


@router.get("/", response_model=ProductSaleListOut)
def list_product_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    barber_id: Optional[int] = None,
    item_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    skip = (page - 1) * page_size
    total, items = crud.get_product_sales(
        db, company_id, skip=skip, limit=page_size,
        date_from=date_from, date_to=date_to,
        barber_id=barber_id, item_id=item_id,
    )
    pages = ceil(total / page_size) if total > 0 else 1
    return ProductSaleListOut(
        items=[ProductSaleOut(**_enrich(ps)) for ps in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/", response_model=ProductSaleOut)
def create_product_sale(
    data: ProductSaleCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    try:
        ps = crud.create_product_sale(db, company_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return ProductSaleOut(**_enrich(ps))


@router.get("/{ps_id}", response_model=ProductSaleOut)
def get_product_sale(
    ps_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    ps = crud.get_product_sale(db, company_id, ps_id)
    if not ps:
        raise HTTPException(404, "Venta de producto no encontrada")
    return ProductSaleOut(**_enrich(ps))


@router.delete("/{ps_id}")
def delete_product_sale(
    ps_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.delete_product_sale(db, company_id, ps_id)
    if not obj:
        raise HTTPException(404, "Venta de producto no encontrada")
    return {"ok": True}
