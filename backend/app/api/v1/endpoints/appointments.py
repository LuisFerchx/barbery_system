from math import ceil
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ....database import get_db
from ....crud import appointment as crud
from ....schemas.appointment import (
    AppointmentCreate,
    AppointmentReschedule,
    AppointmentUpdate,
    AppointmentOut,
    AppointmentListOut,
)
from ....security import get_current_user, get_company_id

router = APIRouter()


def _out(appt) -> AppointmentOut:
    return AppointmentOut(**crud._enrich(appt))


@router.get("/", response_model=AppointmentListOut)
def list_appointments(
    date: Optional[str] = Query(None, description="Filtrar por día YYYY-MM-DD"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    barber_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    skip = (page - 1) * page_size
    total, items = crud.get_appointments(
        db, company_id,
        date=date, date_from=date_from, date_to=date_to,
        barber_id=barber_id, status=status,
        skip=skip, limit=page_size,
    )
    pages = ceil(total / page_size) if total > 0 else 1
    return AppointmentListOut(
        items=[_out(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/", response_model=AppointmentOut, status_code=201)
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    try:
        appt = crud.create_appointment(db, company_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _out(appt)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    appt = crud.get_appointment(db, company_id, appointment_id)
    if not appt:
        raise HTTPException(404, "Cita no encontrada")
    return _out(appt)


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    appt = crud.update_appointment(db, company_id, appointment_id, data)
    if not appt:
        raise HTTPException(404, "Cita no encontrada")
    return _out(appt)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule_appointment(
    appointment_id: int,
    data: AppointmentReschedule,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    try:
        appt = crud.reschedule_appointment(db, company_id, appointment_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not appt:
        raise HTTPException(404, "Cita no encontrada")
    return _out(appt)


@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    company_id: int = Depends(get_company_id),
):
    appt = crud.cancel_appointment(db, company_id, appointment_id)
    if not appt:
        raise HTTPException(404, "Cita no encontrada")
    return {"ok": True}
