"""add_auto_confirm_appointments_to_companies

Revision ID: a2b3c4d5e6f7
Revises: 19d1838ae20c
Create Date: 2026-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '19d1838ae20c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column(
        'auto_confirm_appointments', sa.Boolean(),
        nullable=False, server_default='false'
    ))


def downgrade() -> None:
    op.drop_column('companies', 'auto_confirm_appointments')
