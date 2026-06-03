"""add_timezone_to_companies

Revision ID: ebfa71fb693f
Revises: b3c4d5e6f7a8
Create Date: 2026-06-02 19:19:29.641065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebfa71fb693f'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column(
        'timezone', sa.String(50), nullable=True,
        server_default='America/Guayaquil',
    ))


def downgrade() -> None:
    op.drop_column('companies', 'timezone')
