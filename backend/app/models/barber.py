from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Barber(Base):
    __tablename__ = "barbers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    lastname = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    commission_rate = Column(Float, default=0.0)  # percentage
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sales = relationship("Sale", back_populates="barber")
    advances = relationship("Advance", back_populates="barber")
    bank_transfers_received = relationship("BankTransfer", back_populates="barber")


class Advance(Base):
    __tablename__ = "advances"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barber = relationship("Barber", back_populates="advances")


class BankTransfer(Base):
    __tablename__ = "bank_transfers"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)
    recipient_name = Column(String(100))
    amount = Column(Float, nullable=False)
    bank = Column(String(50))  # Pichincha, Austro, Jardín Azuayo, JEP, Guayaquil
    reference = Column(String(100))
    date = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barber = relationship("Barber", back_populates="bank_transfers_received")
