"""add_code_to_appointments

Revision ID: f1a2b3c4d5e6
Revises: 779844f2924e
Create Date: 2026-05-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '779844f2924e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('appointments', sa.Column('code', sa.String(12), nullable=True))
    op.create_index('ix_appointments_code', 'appointments', ['code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_appointments_code', table_name='appointments')
    op.drop_column('appointments', 'code')
