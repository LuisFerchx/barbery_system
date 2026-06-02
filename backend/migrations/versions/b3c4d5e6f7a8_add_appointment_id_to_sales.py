"""add_appointment_id_to_sales

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sales', sa.Column(
        'appointment_id', sa.Integer(),
        sa.ForeignKey('appointments.id'), nullable=True
    ))
    op.create_index('ix_sales_appointment_id', 'sales', ['appointment_id'])


def downgrade() -> None:
    op.drop_index('ix_sales_appointment_id', 'sales')
    op.drop_column('sales', 'appointment_id')
