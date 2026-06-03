import pytest
from datetime import date, datetime, timezone, time
from decimal import Decimal
from zoneinfo import ZoneInfo

_TZ = ZoneInfo('America/Guayaquil')

from app.models.barber import Barber
from app.models.catalog import ServiceCatalog
from app.models.company import Company
from app.schemas.barber_hours import BarberHoursCreate, BarberHoursUpdate
from app.crud.barber_hours import (
    create_barber_hours,
    get_barber_hours,
    get_blocked_intervals,
    update_barber_hours,
)
from app.crud.public_booking import get_available_slots
from app.crud.appointment import create_appointment, reschedule_appointment
from app.schemas.appointment import AppointmentCreate, AppointmentReschedule


@pytest.fixture
def sample_data(db):
    # Set company operating hours
    """
    Populate the database with sample data used by tests: sets company operating hours and operating days, and creates a barber (id=1) and a service (id=1).
     
    Creates:
    - Company operating hours: open "08:00", close "18:00", operating_days "0,1,2,3,4,5,6".
    - Barber with id=1, company_id=1, name "Diego Maradona", active.
    - ServiceCatalog with id=1, company_id=1, name "Corte Premium", category "haircut", price 20.0, duration 60, active.
    """
    company = db.query(Company).filter(Company.id == 1).first()
    company.open_hour = "08:00"
    company.close_hour = "18:00"
    company.operating_days = "0,1,2,3,4,5,6"  # Every day
    db.commit()

    # Create a Barber
    barber = Barber(id=1, company_id=1, name="Diego", lastname="Maradona", is_active=True)
    db.add(barber)

    # Create a Service
    service = ServiceCatalog(id=1, company_id=1, name="Corte Premium", category="haircut", price=Decimal("20.0"), duration=60, is_active=True)
    db.add(service)

    db.commit()


def test_create_and_get_blocked_hours(db, sample_data):
    # Create recurring block for Lunch (13:00 - 14:00) on Mondays and Tuesdays
    data = BarberHoursCreate(
        name="Almuerzo",
        start_time="13:00",
        end_time="14:00",
        start_date=date(2026, 6, 1),  # Monday
        end_date=date(2026, 6, 30),
        is_recurring=True,
        day_of_week="0,1",  # Mon, Tue
    )
    bh = create_barber_hours(db, 1, 1, data)
    assert bh.name == "Almuerzo"
    assert bh.is_recurring is True
    assert bh.day_of_week == "0,1"

    # Fetch
    hours = get_barber_hours(db, 1, 1)
    assert len(hours) == 1
    assert hours[0].id == bh.id


def test_blocked_intervals_calculation(db, sample_data):
    # Monday June 1st, 2026 (Mon) and Wednesday June 3rd, 2026 (Wed)
    mon = date(2026, 6, 1)
    wed = date(2026, 6, 3)

    data = BarberHoursCreate(
        name="Almuerzo",
        start_time="13:00",
        end_time="14:00",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 30),
        is_recurring=True,
        day_of_week="0,1",  # Mon, Tue
    )
    create_barber_hours(db, 1, 1, data)

    # Monday should have a blocked interval
    intervals_mon = get_blocked_intervals(db, 1, 1, mon)
    assert len(intervals_mon) == 1
    start, end = intervals_mon[0]
    assert start.strftime("%H:%M") == "13:00"
    assert end.strftime("%H:%M") == "14:00"

    # Wednesday should NOT have a blocked interval (not Mon or Tue)
    intervals_wed = get_blocked_intervals(db, 1, 1, wed)
    assert len(intervals_wed) == 0


def test_available_slots_exclude_blocked_hours(db, sample_data):
    """
    Verifies available appointment slots exclude times that overlap a non-recurring blocked interval for a specific date.
    
    Checks that a slot at "13:00" is initially available, creates a one-day non-recurring barber block from 13:00 to 14:00 on 2026-06-01, and then asserts that available slots for that date no longer include the "13:00" time (and thus exclude times that would overlap the blocked interval).
    """
    company = db.query(Company).filter(Company.id == 1).first()
    mon_str = "2026-06-01"

    # Verify initial slots include 13:00
    slots_initial = get_available_slots(db, company, 1, mon_str, 1)
    assert any(s.time == "13:00" for s in slots_initial)

    # Create blocked hours for 13:00 - 14:00
    data = BarberHoursCreate(
        name="Almuerzo",
        start_time="13:00",
        end_time="14:00",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 1),
        is_recurring=False,
    )
    create_barber_hours(db, 1, 1, data)

    # Slots on that Monday should now exclude 13:00 and 13:15, 13:30, 13:45
    # (Since service duration is 60 min, a slot at 12:15, 12:30, 12:45 is also blocked because it overlaps into 13:00+!)
    slots_after = get_available_slots(db, company, 1, mon_str, 1)
    assert not any(s.time == "13:00" for s in slots_after)


def test_appointment_booking_collision_with_blocks(db, sample_data):
    # Block 13:00 - 14:00
    data = BarberHoursCreate(
        name="Almuerzo",
        start_time="13:00",
        end_time="14:00",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 1),
        is_recurring=False,
    )
    create_barber_hours(db, 1, 1, data)

    # Attempt booking during blocked time (13:00 - 14:00 Ecuador, service is 60 min)
    appt_in = AppointmentCreate(
        barber_id=1,
        service_id=1,
        scheduled_at=datetime(2026, 6, 1, 13, 0, tzinfo=_TZ),
    )
    
    with pytest.raises(ValueError) as exc:
        create_appointment(db, 1, appt_in)
    assert "El barbero tiene un bloqueo de horario en ese momento" in str(exc.value)


def test_recurrence_exception_handling(db, sample_data):
    """
    Verifies that adding an exception date to a recurring barber-hours block restores available slots for that date.
    
    Creates a recurring blocked interval (13:00–14:00) that applies every day, confirms that the 13:00 slot is initially excluded on 2026-06-01, updates the barber-hours record to add 2026-06-01 as an exception, and confirms that the 13:00 slot is available on that date afterward.
    """
    company = db.query(Company).filter(Company.id == 1).first()
    mon_str = "2026-06-01"
    mon_date = date(2026, 6, 1)

    # Create recurring block 13:00 - 14:00
    data = BarberHoursCreate(
        name="Almuerzo",
        start_time="13:00",
        end_time="14:00",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 30),
        is_recurring=True,
        day_of_week="0,1,2,3,4,5,6",
    )
    bh = create_barber_hours(db, 1, 1, data)

    # Verify slots initially exclude 13:00
    slots_initial = get_available_slots(db, company, 1, mon_str, 1)
    assert not any(s.time == "13:00" for s in slots_initial)

    # Add Mon June 1st to exceptions
    update_data = BarberHoursUpdate(exceptions="2026-06-01")
    update_barber_hours(db, 1, bh.id, update_data)

    # Verify slots on June 1st now INCLUDE 13:00 (recurrence skipped)
    slots_after_exception = get_available_slots(db, company, 1, mon_str, 1)
    assert any(s.time == "13:00" for s in slots_after_exception)
