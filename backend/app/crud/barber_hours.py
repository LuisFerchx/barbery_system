from datetime import date as ddate, datetime, timezone, timedelta
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from ..models.barber_hours import BarberHours
from ..schemas.barber_hours import BarberHoursCreate, BarberHoursUpdate


def get_barber_hours(db: Session, company_id: int, barber_id: int) -> List[BarberHours]:
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
    db_obj = get_barber_hours_by_id(db, company_id, hours_id)
    if not db_obj:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(db_obj, k, v)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_barber_hours(db: Session, company_id: int, hours_id: int) -> Optional[BarberHours]:
    db_obj = get_barber_hours_by_id(db, company_id, hours_id)
    if not db_obj:
        return None
    db.delete(db_obj)
    db.commit()
    return db_obj


def get_blocked_intervals(
    db: Session, company_id: int, barber_id: int, target_date: ddate
) -> List[Tuple[datetime, datetime]]:
    """
    Computes all blocked time intervals (start_dt, end_dt) in UTC
    for a given barber on a specific date.
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

            start_dt = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                sh,
                sm,
                tzinfo=timezone.utc,
            )
            end_dt = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                eh,
                em,
                tzinfo=timezone.utc,
            )

            if start_dt < end_dt:
                intervals.append((start_dt, end_dt))
        except Exception:
            pass  # Skip corrupted time values safely

    return intervals
