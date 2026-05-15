from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class ServiceCatalog(Base):
    __tablename__ = "service_catalog"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)  # haircut, beard, combo, other
    price = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 4), nullable=True)
    duration = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    company = relationship("Company")
    sales = relationship("Sale", back_populates="service")


class ProductCatalog(Base):
    __tablename__ = "product_catalog"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=False)
    sale_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True)

    company = relationship("Company")
