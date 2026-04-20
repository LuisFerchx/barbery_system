from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from ....database import get_db
from ....schemas.sale import SaleCreate, SaleUpdate, SaleOut, PaginatedSales
from ....crud.sale import get_sales, get_sale, create_sale, update_sale, delete_sale, get_daily_summary
from ....security import get_current_user

router = APIRouter()


def _to_out(sale) -> dict:
    d = {
        "id": sale.id,
        "date": sale.date,
        "client_name": sale.client_name,
        "client_lastname": sale.client_lastname,
        "contact": sale.contact,
        "barber_id": sale.barber_id,
        "service_id": sale.service_id,
        "service_value": sale.service_value,
        "product_id": sale.product_id,
        "product_value": sale.product_value,
        "drink": sale.drink,
        "total": sale.total,
        "tip": sale.tip,
        "bank_transfer": sale.bank_transfer,
        "barber_commission": sale.barber_commission,
        "status": sale.status,
        "notes": sale.notes,
        "created_at": sale.created_at,
        "barber_name": f"{sale.barber.name} {sale.barber.lastname or ''}".strip() if sale.barber else None,
        "service_name": sale.service.name if sale.service else None,
        "product_name": sale.product.name if sale.product else None,
    }
    return d


@router.get("/", response_model=PaginatedSales)
def list_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    barber_id: Optional[int] = None,
    client_name: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    skip = (page - 1) * page_size
    total, items = get_sales(db, skip, page_size, date_from, date_to, barber_id, client_name)
    pages = (total + page_size - 1) // page_size
    return PaginatedSales(
        items=[SaleOut(**_to_out(s)) for s in items],
        total=total, page=page, page_size=page_size, pages=pages
    )


@router.post("/", response_model=SaleOut)
def new_sale(sale: SaleCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = create_sale(db, sale)
    return SaleOut(**_to_out(get_sale(db, s.id)))


@router.get("/daily-summary")
def daily_summary(target_date: date = Query(default=None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    from datetime import date as dt
    d = target_date or dt.today()
    return get_daily_summary(db, d)


@router.get("/{sale_id}", response_model=SaleOut)
def get_one(sale_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = get_sale(db, sale_id)
    if not s:
        raise HTTPException(404, "Venta no encontrada")
    return SaleOut(**_to_out(s))


@router.put("/{sale_id}", response_model=SaleOut)
def edit_sale(sale_id: int, sale: SaleUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = update_sale(db, sale_id, sale)
    if not s:
        raise HTTPException(404, "Venta no encontrada")
    return SaleOut(**_to_out(get_sale(db, s.id)))


@router.delete("/{sale_id}")
def remove_sale(sale_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    delete_sale(db, sale_id)
    return {"ok": True}
