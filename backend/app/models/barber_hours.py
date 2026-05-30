from sqlalchemy import Column, Integer, String, Boolean, Date, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class BarberHours(Base):
    __tablename__ = "barber_hours"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(5), nullable=False)  # "HH:MM" format
    end_time = Column(String(5), nullable=False)    # "HH:MM" format
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_recurring = Column(Boolean, default=True, nullable=False)
    day_of_week = Column(String(50), nullable=True)  # e.g., "0,1,2,3,4"
    exceptions = Column(Text, nullable=True)         # e.g., "2026-06-02,2026-06-05"

    company = relationship("Company")
    barber = relationship("Barber")
