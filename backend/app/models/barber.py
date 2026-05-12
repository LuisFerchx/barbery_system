from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, func
from sqlalchemy.orm import relationship
from ..database import Base


class Barber(Base):
    __tablename__ = "barbers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    lastname = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    commission_rate = Column(Numeric(5, 4), nullable=False, default=0.40)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sales = relationship("Sale", back_populates="barber")
    product_sales = relationship("ProductSale", back_populates="barber")
