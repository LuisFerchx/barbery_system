from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, func
from sqlalchemy.orm import relationship
from ..database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    client_name = Column(String(100), nullable=False)
    client_lastname = Column(String(100))
    contact = Column(String(50), default="REGISTRADO")
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    service_value = Column(Float, default=0.0)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_value = Column(Float, default=0.0)
    drink = Column(String(50), default="NADA")
    total = Column(Float, default=0.0)
    tip = Column(Float, default=0.0)
    bank_transfer = Column(Float, default=0.0)
    barber_commission = Column(Float, default=0.0)
    status = Column(String(20), default="completed")
    notes = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barber = relationship("Barber", back_populates="sales")
    service = relationship("Service")
    product = relationship("Product")
