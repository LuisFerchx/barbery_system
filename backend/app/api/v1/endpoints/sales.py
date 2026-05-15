from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from math import ceil
from ....database import get_db
from ....crud import sale as crud
from ....schemas.sale import SaleCreate, SaleOut, SaleListOut
from ....security import get_current_user, get_company_id

router = APIRouter()


def _enrich(sale) -> dict:
    d = {c.name: getattr(sale, c.name) for c in sale.__table__.columns}
    d["barber_name"] = f"{sale.barber.name} {sale.barber.lastname}" if sale.barber else None
    d["client_name"] = f"{sale.client.name} {sale.client.lastname}" if sale.client else None
    d["service_name"] = sale.service.name if sale.service else None
    d["courtesy_drink_item_name"] = sale.courtesy_drink_item.name if sale.courtesy_drink_item else None
    return d


@router.get("/", response_model=SaleListOut)
def list_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    barber_id: Optional[int] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    skip = (page - 1) * page_size
    total, items = crud.get_sales(
        db, company_id, skip=skip, limit=page_size,
        date_from=date_from, date_to=date_to,
        barber_id=barber_id, client_id=client_id,
    )
    pages = ceil(total / page_size) if total > 0 else 1
    return SaleListOut(
        items=[SaleOut(**_enrich(s)) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/", response_model=SaleOut)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    try:
        sale = crud.create_sale(db, company_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return SaleOut(**_enrich(sale))


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    sale = crud.get_sale(db, company_id, sale_id)
    if not sale:
        raise HTTPException(404, "Venta no encontrada")
    return SaleOut(**_enrich(sale))


@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    obj = crud.delete_sale(db, company_id, sale_id)
    if not obj:
        raise HTTPException(404, "Venta no encontrada")
    return {"ok": True}
