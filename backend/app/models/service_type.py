from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
from .associations import barber_service_types


class ServiceType(Base):
    __tablename__ = "service_types"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    company = relationship("Company")
    services = relationship("ServiceCatalog", back_populates="service_type")
    barbers = relationship("Barber", secondary=barber_service_types, back_populates="service_types")
