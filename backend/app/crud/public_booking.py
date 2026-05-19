import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from ..models.appointment import Appointment
from ..models.barber import Barber
from ..models.catalog import ServiceCatalog
from ..models.client import Client
from ..models.company import Company
from .appointment import (
    DEFAULT_DURATION,
    ACTIVE_STATUSES,
    _validate_schedule,
    _check_barber_conflict,
    _parse_operating_days,
)
from ..schemas.public_booking import (
    BookingCreate,
    SlotOut,
    BookingOut,
    AppointmentPublicOut,
)

_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


def get_shop(db: Session, slug: str) -> Optional[Company]:
    return db.query(Company).filter(Company.slug == slug, Company.is_active == True).first()


def get_public_barbers(db: Session, company_id: int) -> List[Barber]:
    return (
        db.query(Barber)
        .filter(Barber.company_id == company_id, Barber.is_active == True)
        .order_by(Barber.name)
        .all()
    )


def get_public_services(db: Session, company_id: int) -> List[ServiceCatalog]:
    return (
        db.query(ServiceCatalog)
        .filter(ServiceCatalog.company_id == company_id, ServiceCatalog.is_active == True)
        .order_by(ServiceCatalog.name)
        .all()
    )


def get_available_slots(
    db: Session,
    company: Company,
    barber_id: int,
    date_str: str,
    service_id: int,
) -> List[SlotOut]:
    if not company.open_hour or not company.close_hour:
        return []

    try:
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return []
    allowed_days = _parse_operating_days(company.operating_days)
    if allowed_days is not None and parsed_date.weekday() not in allowed_days:
        return []

    service = db.query(ServiceCatalog).filter(
        ServiceCatalog.id == service_id,
        ServiceCatalog.company_id == company.id,
        ServiceCatalog.is_active == True,
    ).first()
    if not service:
        return []

    duration = service.duration or DEFAULT_DURATION

    open_h, open_m = map(int, company.open_hour.split(":"))
    close_h, close_m = map(int, company.close_hour.split(":"))

    day_start = datetime(parsed_date.year, parsed_date.month, parsed_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(parsed_date.year, parsed_date.month, parsed_date.day, 23, 59, 59, tzinfo=timezone.utc)

    existing = (
        db.query(Appointment)
        .filter(
            Appointment.company_id == company.id,
            Appointment.barber_id == barber_id,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.scheduled_at >= day_start,
            Appointment.scheduled_at <= day_end,
        )
        .all()
    )

    open_dt = datetime(parsed_date.year, parsed_date.month, parsed_date.day, open_h, open_m, tzinfo=timezone.utc)
    close_dt = datetime(parsed_date.year, parsed_date.month, parsed_date.day, close_h, close_m, tzinfo=timezone.utc)

    slots: List[SlotOut] = []
    current = open_dt

    while current + timedelta(minutes=duration) <= close_dt:
        slot_end = current + timedelta(minutes=duration)
        conflict = any(
            appt.scheduled_at < slot_end and appt.end_at > current
            for appt in existing
        )
        if not conflict:
            slots.append(SlotOut(
                time=current.strftime("%H:%M"),
                datetime=current.isoformat(),
            ))
        current += timedelta(minutes=15)

    return slots


def book_appointment_atomic(
    db: Session,
    company: Company,
    data: BookingCreate,
) -> BookingOut:
    service = db.query(ServiceCatalog).filter(
        ServiceCatalog.id == data.service_id,
        ServiceCatalog.company_id == company.id,
        ServiceCatalog.is_active == True,
    ).first()
    if not service:
        raise ValueError("Servicio no encontrado o inactivo")

    barber = db.query(Barber).filter(
        Barber.id == data.barber_id,
        Barber.company_id == company.id,
        Barber.is_active == True,
    ).first()
    if not barber:
        raise ValueError("Barbero no encontrado o inactivo")

    duration = service.duration or DEFAULT_DURATION
    scheduled_at = data.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    end_at = scheduled_at + timedelta(minutes=duration)

    _validate_schedule(company, scheduled_at, end_at)
    _check_barber_conflict(db, company.id, data.barber_id, scheduled_at, end_at)

    client = (
        db.query(Client)
        .filter(
            Client.company_id == company.id,
            Client.phone == data.client_phone,
            Client.is_active == True,
        )
        .first()
    )
    if not client:
        client = Client(
            company_id=company.id,
            name=data.client_name,
            lastname=data.client_lastname,
            phone=data.client_phone,
            email=data.client_email,
        )
        db.add(client)
        db.flush()

    # Retry once on (extremely unlikely) code collision
    code = _generate_code()
    if db.query(Appointment).filter(Appointment.code == code).first():
        code = _generate_code()

    appt = Appointment(
        company_id=company.id,
        client_id=client.id,
        barber_id=data.barber_id,
        service_id=data.service_id,
        scheduled_at=scheduled_at,
        end_at=end_at,
        status="pending",
        code=code,
        notes=data.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    client_name = f"{client.name} {client.lastname}"
    barber_name = f"{barber.name} {barber.lastname}"
    return BookingOut(
        id=appt.id,
        code=appt.code,
        barber_name=barber_name,
        service_name=service.name,
        scheduled_at=appt.scheduled_at,
        end_at=appt.end_at,
        duration_minutes=duration,
        status=appt.status,
        client_name=client_name,
    )


def get_appointment_by_code(db: Session, code: str) -> Optional[AppointmentPublicOut]:
    appt = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.barber),
            joinedload(Appointment.client),
            joinedload(Appointment.service),
            joinedload(Appointment.company),
        )
        .filter(Appointment.code == code)
        .first()
    )
    if not appt:
        return None

    duration = (appt.service.duration or DEFAULT_DURATION) if appt.service else DEFAULT_DURATION
    client_name = f"{appt.client.name} {appt.client.lastname}" if appt.client else None

    return AppointmentPublicOut(
        id=appt.id,
        code=appt.code,
        shop_name=appt.company.name if appt.company else "",
        shop_slug=appt.company.slug if appt.company else "",
        barber_name=f"{appt.barber.name} {appt.barber.lastname}" if appt.barber else "",
        service_name=appt.service.name if appt.service else "",
        scheduled_at=appt.scheduled_at,
        end_at=appt.end_at,
        duration_minutes=duration,
        status=appt.status,
        client_name=client_name,
        notes=appt.notes,
    )
