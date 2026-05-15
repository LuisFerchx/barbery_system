from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)  # merchandise, courtesy
    unit = Column(String(20), default="unidad")
    stock_current = Column(Numeric(10, 3), default=0)
    stock_minimum = Column(Numeric(10, 3), default=5)
    cost_per_unit = Column(Numeric(10, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    movements = relationship("InventoryMovement", back_populates="item")
    product_sales = relationship("ProductSale", back_populates="item")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False, index=True)
    movement_type = Column(String(20), nullable=False)  # in, out, adjustment
    quantity = Column(Numeric(10, 3), nullable=False)
    reason = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    product_sale_id = Column(Integer, ForeignKey("product_sales.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("InventoryItem", back_populates="movements")
    product_sale = relationship("ProductSale", back_populates="inventory_movements")
