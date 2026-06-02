from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from ..database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    commission_by_service = Column(Boolean, nullable=False, default=False, server_default='false')
    auto_confirm_appointments = Column(Boolean, nullable=False, default=False, server_default='false')
    open_hour      = Column(String(5),  nullable=True)
    close_hour     = Column(String(5),  nullable=True)
    operating_days = Column(String(27), nullable=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
