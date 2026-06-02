from sqlalchemy import Column, Integer, ForeignKey, Table
from ..database import Base

barber_service_types = Table(
    "barber_service_types",
    Base.metadata,
    Column("barber_id", Integer, ForeignKey("barbers.id"), primary_key=True),
    Column("service_type_id", Integer, ForeignKey("service_types.id"), primary_key=True),
)
