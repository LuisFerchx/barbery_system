from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from ....database import get_db
from ....crud import public_booking as crud
from ....schemas.public_booking import (
    ShopPublicOut,
    BarberPublicOut,
    ServicePublicOut,
    SlotOut,
    BookingCreate,
    BookingOut,
    AppointmentPublicOut,
)
from ....utils.supabase import attach_signed_url

router = APIRouter()


def _get_company_or_404(slug: str, db: Session):
    company = crud.get_shop(db, slug)
    if not company:
        raise HTTPException(status_code=404, detail="Barbería no encontrada")
    return company


@router.get("/{slug}", response_model=ShopPublicOut)
def get_shop_info(slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(slug, db)
    attach_signed_url(company, "logo_url")
    return company


@router.get("/{slug}/barbers", response_model=List[BarberPublicOut])
def list_barbers(slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(slug, db)
    barbers = crud.get_public_barbers(db, company.id)
    for b in barbers:
        attach_signed_url(b, "photo_url")
    return barbers


@router.get("/{slug}/services", response_model=List[ServicePublicOut])
def list_services(slug: str, db: Session = Depends(get_db)):
    company = _get_company_or_404(slug, db)
    return crud.get_public_services(db, company.id)


@router.get("/{slug}/slots", response_model=List[SlotOut])
def get_slots(
    slug: str,
    barber_id: int = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
    service_id: int = Query(...),
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(slug, db)
    return crud.get_available_slots(db, company, barber_id, date, service_id)


@router.post("/{slug}/book", response_model=BookingOut, status_code=201)
def book_appointment(slug: str, data: BookingCreate, db: Session = Depends(get_db)):
    company = _get_company_or_404(slug, db)
    try:
        return crud.book_appointment_atomic(db, company, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/appointment/{code}", response_model=AppointmentPublicOut)
def get_appointment_by_code(code: str, db: Session = Depends(get_db)):
    result = crud.get_appointment_by_code(db, code.upper())
    if not result:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return result
