"""add_company_schedule

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a1b2
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c3d4e5f6a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('open_hour', sa.String(5), nullable=True))
    op.add_column('companies', sa.Column('close_hour', sa.String(5), nullable=True))
    op.add_column('companies', sa.Column('operating_days', sa.String(27), nullable=True))


def downgrade() -> None:
    op.drop_column('companies', 'operating_days')
    op.drop_column('companies', 'close_hour')
    op.drop_column('companies', 'open_hour')
