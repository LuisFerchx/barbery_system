from datetime import date as ddate, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from ..models.barber_hours import BarberHours
from ..schemas.barber_hours import BarberHoursCreate, BarberHoursUpdate


def get_barber_hours(db: Session, company_id: int, barber_id: int) -> List[BarberHours]:
    """
    Retrieve BarberHours for a specific barber within a company, ordered by most recent start_date and then by start_time.
    
    Returns:
        List[BarberHours]: BarberHours records matching the given company_id and barber_id, ordered by start_date descending and then start_time.
    """
    return (
        db.query(BarberHours)
        .filter(
            BarberHours.company_id == company_id,
            BarberHours.barber_id == barber_id,
        )
        .order_by(BarberHours.start_date.desc(), BarberHours.start_time)
        .all()
    )


def get_barber_hours_by_id(db: Session, company_id: int, hours_id: int) -> Optional[BarberHours]:
    """
    Retrieve a BarberHours record for the given company by its ID.
    
    Returns:
        The matching `BarberHours` instance, or `None` if no record exists.
    """
    return (
        db.query(BarberHours)
        .filter(
            BarberHours.id == hours_id,
            BarberHours.company_id == company_id,
        )
        .first()
    )


def create_barber_hours(
    db: Session, company_id: int, barber_id: int, data: BarberHoursCreate
) -> BarberHours:
    """
    Create and persist a BarberHours record for the given barber and company.
    
    Parameters:
        data (BarberHoursCreate): Attributes used to populate the new BarberHours record.
    
    Returns:
        BarberHours: The created ORM instance with database-populated fields (for example, assigned `id` and any default values).
    """
    db_obj = BarberHours(
        **data.model_dump(),
        company_id=company_id,
        barber_id=barber_id,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_barber_hours(
    db: Session, company_id: int, hours_id: int, data: BarberHoursUpdate
) -> Optional[BarberHours]:
    """
    Update fields of an existing BarberHours record and persist the changes.
    
    Parameters:
        db: SQLAlchemy session used to query and persist the record.
        company_id (int): ID of the company that owns the BarberHours record.
        hours_id (int): ID of the BarberHours record to update.
        data (BarberHoursUpdate): Pydantic-style update model; only fields present in the model (unset excluded) are applied.
    
    Returns:
        BarberHours | None: The updated BarberHours ORM object if found and updated, `None` if no matching record exists.
    """
    db_obj = get_barber_hours_by_id(db, company_id, hours_id)
    if not db_obj:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_barber_hours(db: Session, company_id: int, hours_id: int) -> Optional[BarberHours]:
    """
    Delete a barber's hours record for the given company and hours ID.
    
    Returns:
        BarberHours: The deleted `BarberHours` instance, or `None` if no matching record was found.
    """
    db_obj = get_barber_hours_by_id(db, company_id, hours_id)
    if not db_obj:
        return None
    db.delete(db_obj)
    db.commit()
    return db_obj


def get_blocked_intervals(
    db: Session, company_id: int, barber_id: int, target_date: ddate,
    tz_str: str = 'America/Guayaquil',
) -> List[Tuple[datetime, datetime]]:
    """
    Compute blocked time intervals for a barber on a specific date and return them as UTC-aware datetimes.
    
    For the given company and barber, finds BarberHours entries whose date range includes `target_date`. For recurring entries, excludes ones where `target_date` is listed in `exceptions` or its weekday is not listed in `day_of_week` (parsing errors for `day_of_week` are ignored). Parses `start_time` and `end_time` as "HH:MM" and constructs timezone-aware UTC datetimes for that date; entries with invalid time values or where the start is not before the end are skipped.
    
    Parameters:
        db (Session): SQLAlchemy session used to query BarberHours.
        company_id (int): Company identifier to filter BarberHours.
        barber_id (int): Barber identifier to filter BarberHours.
        target_date (date): Date for which to compute blocked intervals.
    
    Returns:
        List[Tuple[datetime, datetime]]: A list of (start_dt, end_dt) tuples in UTC for blocked intervals on `target_date`.
    """
    blocked_entries = (
        db.query(BarberHours)
        .filter(
            BarberHours.company_id == company_id,
            BarberHours.barber_id == barber_id,
            BarberHours.start_date <= target_date,
            BarberHours.end_date >= target_date,
        )
        .all()
    )

    intervals: List[Tuple[datetime, datetime]] = []
    date_str = target_date.strftime("%Y-%m-%d")
    weekday = target_date.weekday()  # Monday = 0, Sunday = 6

    for bh in blocked_entries:
        if bh.is_recurring:
            # Check exceptions
            if bh.exceptions:
                exceptions_list = [d.strip() for d in bh.exceptions.split(",")]
                if date_str in exceptions_list:
                    continue

            # Check weekdays if specified
            if bh.day_of_week:
                try:
                    allowed_days = [int(d.strip()) for d in bh.day_of_week.split(",") if d.strip()]
                    if weekday not in allowed_days:
                        continue
                except ValueError:
                    pass

        # Build timezone-aware datetimes for the slot start and end on this specific day
        try:
            sh, sm = map(int, bh.start_time.split(":"))
            eh, em = map(int, bh.end_time.split(":"))

            tz = ZoneInfo(tz_str)
            start_dt = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                sh,
                sm,
                tzinfo=tz,
            )
            end_dt = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                eh,
                em,
                tzinfo=tz,
            )

            if start_dt < end_dt:
                intervals.append((start_dt, end_dt))
        except Exception:
            pass  # Skip corrupted time values safely

    return intervals
