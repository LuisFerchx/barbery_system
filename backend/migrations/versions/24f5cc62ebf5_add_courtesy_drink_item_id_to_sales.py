"""add_courtesy_drink_item_id_to_sales

Revision ID: 24f5cc62ebf5
Revises: 61125d89a9da
Create Date: 2026-05-12 07:41:03.975231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24f5cc62ebf5'
down_revision: Union[str, None] = '61125d89a9da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('courtesy_drink_item_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('sales', 'courtesy_drink_item_id')
