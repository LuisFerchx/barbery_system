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
    """
    Build a serializable dictionary representing an Appointment with related display fields.
    
    Creates a dict containing all columns from the Appointment row plus:
    - `barber_name`: "name lastname" when a barber is present, otherwise "".
    - `client_name`: "name lastname" when a client is present, otherwise `None`.
    - `service_name`: the service name when present, otherwise "".
    - `duration_minutes`: the service duration when set, otherwise the module DEFAULT_DURATION.
    
    Parameters:
        appt (Appointment): The Appointment ORM instance to serialize.
    
    Returns:
        dict: A mapping of appointment column names to values extended with the additional keys described above.
    """
    d = {c.name: getattr(appt, c.name) for c in appt.__table__.columns}
    d["barber_name"] = f"{appt.barber.name} {appt.barber.lastname}" if appt.barber else ""
    d["client_name"] = (
        f"{appt.client.name} {appt.client.lastname}" if appt.client else None
    )
    d["service_name"] = appt.service.name if appt.service else ""
    d["duration_minutes"] = appt.service.duration or DEFAULT_DURATION if appt.service else DEFAULT_DURATION
    return d


def _load_with_relations(q):
    """
    Attach eager-loading options to an Appointment query for barber, client, and service relationships.
    
    Parameters:
        q: A SQLAlchemy Query or selectable for Appointment.
    
    Returns:
        The same query augmented with joinedload options for `barber`, `client`, and `service`.
    """
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
    """
    Parse a company's `operating_days` string into a set of weekday integers (0=Mon..6=Sun).
    
    Supports these input formats:
    - 7-character bitmask of `0`/`1` (e.g., "1111100" for Mon–Fri).
    - Comma-separated tokens (e.g., "mon,tue,wed" or Spanish names); tokens are resolved via `DAY_MAP`.
    - JSON array of integers or strings (e.g., `[0,1,2]` or `["lunes","martes"]`).
    
    Parameters:
        operating_days (Optional[str]): Raw operating-days value from the company configuration.
    
    Returns:
        Optional[set]: A set of weekday integers (0=Mon..6=Sun) when parsing succeeds and yields at least one day, or `None` when the input is empty, unparseable, or yields no valid days.
    """
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
    """
    Validate that an appointment's start and end datetimes comply with the company's operating hours and allowed weekdays.
    
    Parameters:
        company (Company): Company record whose `open_hour`, `close_hour`, and `operating_days` are used for validation.
        scheduled_at (datetime): Appointment start datetime.
        end_at (datetime): Appointment end datetime.
    
    Raises:
        ValueError: If `scheduled_at` is outside `company.open_hour`–`company.close_hour`.
        ValueError: If `scheduled_at` falls on a weekday not listed in `company.operating_days`.
    """
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
    """
    Check for overlapping active appointments for a barber and raise a conflict error.
    
    Checks active appointments for the given company and barber; if any appointment's time interval intersects [scheduled_at, end_at) (optionally ignoring the appointment with id `exclude_id`), raises a ValueError.
    
    Parameters:
        company_id (int): Company identifier to scope the search.
        barber_id (int): Barber identifier to check for conflicts.
        scheduled_at (datetime): Proposed appointment start time.
        end_at (datetime): Proposed appointment end time.
        exclude_id (Optional[int]): Appointment id to ignore when checking (useful when rescheduling).
    
    Raises:
        ValueError: If an overlapping active appointment is found for the barber.
    """
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


def _check_barber_block_conflict(
    db: Session,
    company_id: int,
    barber_id: int,
    scheduled_at: datetime,
    end_at: datetime,
) -> None:
    """
    Check whether the barber has any blocked intervals that overlap a proposed appointment time.
    
    Raises:
        ValueError: If any blocked interval overlaps the [scheduled_at, end_at) window; message is "El barbero tiene un bloqueo de horario en ese momento".
    """
    from .barber_hours import get_blocked_intervals

    target_date = scheduled_at.date()
    blocked = get_blocked_intervals(db, company_id, barber_id, target_date)
    for b_start, b_end in blocked:
        if scheduled_at < b_end and end_at > b_start:
            raise ValueError("El barbero tiene un bloqueo de horario en ese momento")


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
    """
    Get appointments for a company filtered by date range and optional criteria.
    
    Parameters:
        company_id (int): ID of the company whose appointments to query.
        date (str, optional): Exact day in "YYYY-MM-DD" format; when provided, filters appointments from 00:00:00 to 23:59:59 UTC of that day.
        date_from (datetime, optional): Inclusive lower bound for appointment `scheduled_at`.
        date_to (datetime, optional): Inclusive upper bound for appointment `scheduled_at`.
        barber_id (int, optional): Filter appointments for a specific barber.
        status (str, optional): Filter appointments by exact status value.
        skip (int, optional): Number of records to skip for pagination.
        limit (int, optional): Maximum number of records to return.
    
    Returns:
        tuple: A pair `(total, items)` where `total` is the total number of matching appointments and `items` is the list of `Appointment` objects for the requested page.
    """
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
    """
    Retrieve a single appointment belonging to the specified company.
    
    The returned Appointment includes related barber, client, and service objects via eager loading.
    
    Returns:
        Appointment | None: The appointment if found, `None` otherwise.
    """
    return _load_with_relations(
        db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.company_id == company_id,
        )
    ).first()


def create_appointment(db: Session, company_id: int, data: AppointmentCreate) -> Appointment:
    """
    Create a new appointment for the specified company after validating related entities, company schedule, and barber availability.
    
    Parameters:
        company_id (int): ID of the company where the appointment will be created.
        data (AppointmentCreate): Appointment payload (includes service_id, barber_id, optional client_id, scheduled_at, notes, etc.).
    
    Returns:
        Appointment: The created appointment with related barber, client, and service loaded.
    
    Raises:
        ValueError: If the service, barber, or provided client is not found or inactive; if the appointment falls outside company operating hours or allowed operating days; if the barber has an overlapping active appointment; or if the appointment overlaps a barber blocked interval.
    """
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
    _check_barber_block_conflict(db, company_id, data.barber_id, scheduled_at, end_at)

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
    """
    Reschedule an appointment to a new start time and revalidate company hours and barber availability.
    
    Updates the appointment's scheduled_at, end_at, and sets status to "pending" after validating the new time against company operating hours and allowed days, checking for overlapping active appointments and barber blocked intervals.
    
    Returns:
        The updated Appointment with barber, client, and service relations loaded, or `None` if no appointment with the given id and company_id exists.
    
    Raises:
        ValueError: If the appointment's current status disallows rescheduling ("cancelled", "completed", or "no_show").
        ValueError: If the new time violates company schedule constraints or overlaps existing appointments or barber blocked intervals.
    """
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
    _check_barber_block_conflict(db, company_id, appt.barber_id, scheduled_at, end_at)

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
    """
    Apply partial updates to an existing appointment and return the refreshed record with related barber, client, and service loaded.
    
    Parameters:
        db (Session): Database session used to load and persist the appointment.
        company_id (int): Company identifier used to scope the appointment lookup.
        appointment_id (int): Identifier of the appointment to update.
        data (AppointmentUpdate): Partial update payload; only fields present in `data` are applied.
    
    Returns:
        Appointment or None: The updated appointment with relations eager-loaded, or `None` if no matching appointment was found.
    
    Notes:
        This function commits the changes to the database and does not perform schedule validation or conflict checks.
    """
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
    """
    Cancel an appointment by setting its status to "cancelled".
    
    Parameters:
        company_id (int): ID of the company that owns the appointment.
        appointment_id (int): ID of the appointment to cancel.
    
    Returns:
        Appointment or None: The updated appointment with status "cancelled", or `None` if no matching appointment was found.
    """
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
