"""add_service_commission_and_duration

Revision ID: c3d4e5f6a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a1b2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('service_catalog',
        sa.Column('commission_rate', sa.Numeric(precision=5, scale=4), nullable=True))
    op.add_column('service_catalog',
        sa.Column('duration', sa.Integer(), nullable=True))
    op.add_column('companies',
        sa.Column('commission_by_service', sa.Boolean(),
                  nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('companies', 'commission_by_service')
    op.drop_column('service_catalog', 'duration')
    op.drop_column('service_catalog', 'commission_rate')
