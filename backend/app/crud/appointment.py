import json
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Optional, Tuple, List

from sqlalchemy.orm import Session, joinedload

from ..models.appointment import Appointment
from ..models.barber import Barber
from ..models.client import Client
from ..models.catalog import ServiceCatalog
from ..models.company import Company
from ..schemas.appointment import AppointmentCreate, AppointmentReschedule, AppointmentUpdate

DEFAULT_DURATION = 30
ACTIVE_STATUSES = ("pending", "confirmed")


def _enrich(appt: Appointment) -> dict:
    d = {c.name: getattr(appt, c.name) for c in appt.__table__.columns}
    d["barber_name"] = f"{appt.barber.name} {appt.barber.lastname}" if appt.barber else ""
    d["client_name"] = (
        f"{appt.client.name} {appt.client.lastname}" if appt.client else None
    )
    d["service_name"] = appt.service.name if appt.service else ""
    d["duration_minutes"] = appt.service.duration or DEFAULT_DURATION if appt.service else DEFAULT_DURATION
    return d


def _load_with_relations(q):
    return q.options(
        joinedload(Appointment.barber),
        joinedload(Appointment.client),
        joinedload(Appointment.service),
    )


DAY_MAP = {
    "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def _parse_operating_days(operating_days: Optional[str]) -> Optional[set]:
    """Returns set of weekday ints (0=Mon..6=Sun) or None if field absent/unparseable."""
    if not operating_days:
        return None
    s = operating_days.strip()

    # 7-char bitmask: "1111100" → Mon-Fri
    if len(s) == 7 and all(c in "01" for c in s):
        return {i for i, c in enumerate(s) if c == "1"}

    # Comma-separated: "mon,tue,wed,thu,fri,sat"
    if "," in s and not s.startswith("["):
        result = set()
        for part in s.split(","):
            mapped = DAY_MAP.get(part.strip().lower())
            if mapped is not None:
                result.add(mapped)
        return result if result else None

    # JSON array of ints [0,1,2,4,5] or strings ["lunes",...]
    try:
        parsed = json.loads(s)
        if isinstance(parsed, list):
            result = set()
            for item in parsed:
                if isinstance(item, int):
                    result.add(item % 7)
                elif isinstance(item, str):
                    mapped = DAY_MAP.get(item.lower().strip())
                    if mapped is not None:
                        result.add(mapped)
            return result if result else None
    except (json.JSONDecodeError, TypeError):
        pass

    return None


def _validate_schedule(company: Company, scheduled_at: datetime, end_at: datetime) -> None:
    appt_time = scheduled_at.time()

    if company.open_hour and company.close_hour:
        from datetime import time as dtime
        open_h, open_m = map(int, company.open_hour.split(":"))
        close_h, close_m = map(int, company.close_hour.split(":"))
        open_time = dtime(open_h, open_m)
        close_time = dtime(close_h, close_m)
        if not (open_time <= appt_time < close_time):
            raise ValueError(
                f"Fuera del horario de atención ({company.open_hour}–{company.close_hour})"
            )

    allowed_days = _parse_operating_days(company.operating_days)
    if allowed_days is not None:
        weekday = scheduled_at.weekday()
        if weekday not in allowed_days:
            raise ValueError("El día seleccionado no es un día de atención")


def _check_barber_conflict(
    db: Session,
    company_id: int,
    barber_id: int,
    scheduled_at: datetime,
    end_at: datetime,
    exclude_id: Optional[int] = None,
) -> None:
    q = db.query(Appointment).filter(
        Appointment.company_id == company_id,
        Appointment.barber_id == barber_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.scheduled_at < end_at,
        Appointment.end_at > scheduled_at,
    )
    if exclude_id:
        q = q.filter(Appointment.id != exclude_id)
    if q.first():
        raise ValueError("El barbero ya tiene una cita en ese horario")


def get_appointments(
    db: Session,
    company_id: int,
    date: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    barber_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[int, List[Appointment]]:
    q = db.query(Appointment).filter(Appointment.company_id == company_id)

    if date:
        from datetime import date as ddate
        parsed = datetime.strptime(date, "%Y-%m-%d").date()
        day_start = datetime(parsed.year, parsed.month, parsed.day, 0, 0, 0, tzinfo=timezone.utc)
        day_end = datetime(parsed.year, parsed.month, parsed.day, 23, 59, 59, tzinfo=timezone.utc)
        q = q.filter(Appointment.scheduled_at >= day_start, Appointment.scheduled_at <= day_end)
    else:
        if date_from:
            q = q.filter(Appointment.scheduled_at >= date_from)
        if date_to:
            q = q.filter(Appointment.scheduled_at <= date_to)

    if barber_id:
        q = q.filter(Appointment.barber_id == barber_id)
    if status:
        q = q.filter(Appointment.status == status)

    total = q.count()
    items = _load_with_relations(q).order_by(Appointment.scheduled_at).offset(skip).limit(limit).all()
    return total, items


def get_appointment(db: Session, company_id: int, appointment_id: int) -> Optional[Appointment]:
    return _load_with_relations(
        db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.company_id == company_id,
        )
    ).first()


def create_appointment(db: Session, company_id: int, data: AppointmentCreate) -> Appointment:
    service = db.query(ServiceCatalog).filter(
        ServiceCatalog.id == data.service_id,
        ServiceCatalog.company_id == company_id,
        ServiceCatalog.is_active == True,
    ).first()
    if not service:
        raise ValueError("Servicio no encontrado o inactivo")

    barber = db.query(Barber).filter(
        Barber.id == data.barber_id,
        Barber.company_id == company_id,
        Barber.is_active == True,
    ).first()
    if not barber:
        raise ValueError("Barbero no encontrado o inactivo")

    if data.client_id:
        client = db.query(Client).filter(
            Client.id == data.client_id,
            Client.company_id == company_id,
            Client.is_active == True,
        ).first()
        if not client:
            raise ValueError("Cliente no encontrado o inactivo")

    duration = service.duration or DEFAULT_DURATION
    scheduled_at = data.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    end_at = scheduled_at + timedelta(minutes=duration)

    company = db.query(Company).filter(Company.id == company_id).first()
    _validate_schedule(company, scheduled_at, end_at)
    _check_barber_conflict(db, company_id, data.barber_id, scheduled_at, end_at)

    appt = Appointment(
        company_id=company_id,
        client_id=data.client_id,
        barber_id=data.barber_id,
        service_id=data.service_id,
        scheduled_at=scheduled_at,
        end_at=end_at,
        status="pending",
        notes=data.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _load_with_relations(
        db.query(Appointment).filter(Appointment.id == appt.id)
    ).first()


def reschedule_appointment(
    db: Session, company_id: int, appointment_id: int, data: AppointmentReschedule
) -> Optional[Appointment]:
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == company_id,
    ).first()
    if not appt:
        return None
    if appt.status in ("cancelled", "completed", "no_show"):
        raise ValueError(f"No se puede reagendar una cita con estado '{appt.status}'")

    service = db.query(ServiceCatalog).filter(ServiceCatalog.id == appt.service_id).first()
    duration = (service.duration if service else None) or DEFAULT_DURATION

    scheduled_at = data.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    end_at = scheduled_at + timedelta(minutes=duration)

    company = db.query(Company).filter(Company.id == company_id).first()
    _validate_schedule(company, scheduled_at, end_at)
    _check_barber_conflict(db, company_id, appt.barber_id, scheduled_at, end_at, exclude_id=appointment_id)

    appt.scheduled_at = scheduled_at
    appt.end_at = end_at
    appt.status = "pending"
    db.commit()
    db.refresh(appt)
    return _load_with_relations(
        db.query(Appointment).filter(Appointment.id == appt.id)
    ).first()


def update_appointment(
    db: Session, company_id: int, appointment_id: int, data: AppointmentUpdate
) -> Optional[Appointment]:
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == company_id,
    ).first()
    if not appt:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(appt, k, v)
    db.commit()
    db.refresh(appt)
    return _load_with_relations(
        db.query(Appointment).filter(Appointment.id == appt.id)
    ).first()


def cancel_appointment(db: Session, company_id: int, appointment_id: int) -> Optional[Appointment]:
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == company_id,
    ).first()
    if not appt:
        return None
    appt.status = "cancelled"
    db.commit()
    db.refresh(appt)
    return appt
