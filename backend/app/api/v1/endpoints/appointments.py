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
    """
    Convert an appointment ORM/model instance into an AppointmentOut schema.
    
    Parameters:
        appt: The appointment ORM/model instance to convert.
    
    Returns:
        An AppointmentOut populated from the appointment's enriched data.
    """
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
    """
    List appointments matching optional filters and return paginated results.
    
    Parameters:
        date (Optional[str]): Filter by exact day in `YYYY-MM-DD` format.
        date_from (Optional[datetime]): Include appointments on or after this datetime.
        date_to (Optional[datetime]): Include appointments on or before this datetime.
        barber_id (Optional[int]): Filter by barber identifier.
        status (Optional[str]): Filter by appointment status.
        page (int): Page number (1-based).
        page_size (int): Number of items per page (1–1000).
    
    Returns:
        AppointmentListOut: Paginated result containing `items` (list of `AppointmentOut`), `total` (total matching items), `page`, `page_size`, and `pages` (total pages).
    """
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
    """
    Create a new appointment for the specified company.
    
    Parameters:
        data (AppointmentCreate): Appointment creation payload with date, time, client and barber details.
        company_id (int): ID of the company to which the appointment will belong.
    
    Returns:
        AppointmentOut: The created appointment enriched for output.
    
    Raises:
        HTTPException: 400 when appointment creation fails due to validation or business rules (propagated from `ValueError`).
    """
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
    """
    Retrieve an appointment by its ID for the current company.
    
    Returns:
        AppointmentOut: The appointment data formatted for output.
    
    Raises:
        HTTPException: 404 if the appointment is not found ("Cita no encontrada").
    """
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
    """
    Update an appointment and return its updated representation.
    
    Parameters:
        appointment_id (int): ID of the appointment to update.
        data (AppointmentUpdate): Fields to apply to the appointment.
    
    Returns:
        AppointmentOut: The updated appointment representation.
    
    Raises:
        HTTPException: 404 if the appointment is not found.
    """
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
    """
    Reschedule an existing appointment to a new date/time.
    
    Parameters:
        appointment_id (int): Identifier of the appointment to reschedule.
        data (AppointmentReschedule): New scheduling details for the appointment.
    
    Returns:
        AppointmentOut: The rescheduled appointment.
    
    Raises:
        HTTPException(400): If the provided scheduling data is invalid (reported from CRUD).
        HTTPException(404): If no appointment with `appointment_id` exists for the current company.
    """
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
    """
    Cancel an appointment for the current company by appointment ID.
    
    Returns:
        dict: `{"ok": True}` when the appointment was successfully cancelled.
    
    Raises:
        HTTPException: 404 with message "Cita no encontrada" if the appointment does not exist.
    """
    appt = crud.cancel_appointment(db, company_id, appointment_id)
    if not appt:
        raise HTTPException(404, "Cita no encontrada")
    return {"ok": True}
