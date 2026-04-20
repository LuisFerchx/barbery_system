from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))  # bebida, producto, insumo
    unit = Column(String(20), default="unidad")
    stock_initial = Column(Integer, default=0)
    stock_current = Column(Integer, default=0)
    stock_opened = Column(Integer, default=0)
    stock_sold = Column(Integer, default=0)
    low_stock_alert = Column(Integer, default=5)
    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    movements = relationship("InventoryMovement", back_populates="item")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    movement_type = Column(String(20), nullable=False)  # entrada, salida, ajuste
    quantity = Column(Integer, nullable=False)
    reason = Column(String(100))
    date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("InventoryItem", back_populates="movements")
