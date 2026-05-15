"""add_company_multitenancy

Revision ID: a1b2c3d4e5f6
Revises: 519e3070a66b
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import table, column


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '519e3070a66b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables where company_id becomes NOT NULL (config tables handled separately)
DATA_TABLES = [
    'barbers',
    'clients',
    'sales',
    'product_sales',
    'inventory_items',
    'expenses',
    'service_catalog',
    'product_catalog',
    'operating_manual_entries',
]

# Tables where company_id stays nullable (superadmin users have no company)
NULLABLE_COMPANY_TABLES = ['users']


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # ── A: Create companies table ──────────────────────────────────────────
    op.create_table(
        'companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_companies_id'), 'companies', ['id'], unique=False)
    op.create_index(op.f('ix_companies_slug'), 'companies', ['slug'], unique=True)

    # ── B: Add company_id nullable to all data tables ──────────────────────
    for tbl in DATA_TABLES + NULLABLE_COMPANY_TABLES:
        op.add_column(tbl, sa.Column('company_id', sa.Integer(), nullable=True))

    # Config tables also get company_id nullable before constraint changes
    op.add_column('income_split_config', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('payment_method_config', sa.Column('company_id', sa.Integer(), nullable=True))

    # ── C: Insert default company and backfill ─────────────────────────────
    companies_t = table('companies',
        column('id', sa.Integer),
        column('name', sa.String),
        column('slug', sa.String),
        column('is_active', sa.Boolean),
    )
    op.bulk_insert(companies_t, [
        {'id': 1, 'name': 'Barbería Principal', 'slug': 'main', 'is_active': True}
    ])

    all_tables = DATA_TABLES + NULLABLE_COMPANY_TABLES + ['income_split_config', 'payment_method_config']
    for tbl in all_tables:
        op.execute(f"UPDATE {tbl} SET company_id = 1")

    # ── D: Config tables — change unique constraints to composite ──────────
    if is_sqlite:
        # SQLite cannot drop unnamed UNIQUE constraints via ALTER TABLE,
        # so we recreate these tables from scratch with the correct schema.

        op.execute("""
            CREATE TABLE income_split_config_new (
                id INTEGER NOT NULL,
                company_id INTEGER NOT NULL,
                name VARCHAR(30) NOT NULL,
                percentage NUMERIC(5, 4) NOT NULL,
                updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
                PRIMARY KEY (id),
                UNIQUE (name, company_id)
            )
        """)
        op.execute("""
            INSERT INTO income_split_config_new (id, company_id, name, percentage, updated_at)
            SELECT id, company_id, name, percentage, updated_at
            FROM income_split_config
        """)
        op.drop_table('income_split_config')
        op.execute("ALTER TABLE income_split_config_new RENAME TO income_split_config")
        op.create_index('ix_income_split_config_id', 'income_split_config', ['id'], unique=False)
        op.create_index('ix_income_split_config_company_id', 'income_split_config', ['company_id'], unique=False)

        op.execute("""
            CREATE TABLE payment_method_config_new (
                id INTEGER NOT NULL,
                company_id INTEGER NOT NULL,
                method VARCHAR(20) NOT NULL,
                commission_rate NUMERIC(5, 4) NOT NULL,
                updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
                PRIMARY KEY (id),
                UNIQUE (method, company_id)
            )
        """)
        op.execute("""
            INSERT INTO payment_method_config_new (id, company_id, method, commission_rate, updated_at)
            SELECT id, company_id, method, commission_rate, updated_at
            FROM payment_method_config
        """)
        op.drop_table('payment_method_config')
        op.execute("ALTER TABLE payment_method_config_new RENAME TO payment_method_config")
        op.create_index('ix_payment_method_config_id', 'payment_method_config', ['id'], unique=False)
        op.create_index('ix_payment_method_config_company_id', 'payment_method_config', ['company_id'], unique=False)

    else:
        # PostgreSQL: ALTER TABLE natively, no table recreation needed.
        # Unnamed UniqueConstraint('col') gets auto-named 'tablename_col_key' in PostgreSQL.

        # income_split_config
        op.alter_column('income_split_config', 'company_id',
                        existing_type=sa.Integer(), nullable=False)
        op.drop_constraint('income_split_config_name_key',
                           'income_split_config', type_='unique')
        op.create_unique_constraint('uq_split_name_company',
                                    'income_split_config', ['name', 'company_id'])
        op.create_index('ix_income_split_config_company_id',
                        'income_split_config', ['company_id'], unique=False)

        # payment_method_config
        op.alter_column('payment_method_config', 'company_id',
                        existing_type=sa.Integer(), nullable=False)
        op.drop_constraint('payment_method_config_method_key',
                           'payment_method_config', type_='unique')
        op.create_unique_constraint('uq_payment_method_company',
                                    'payment_method_config', ['method', 'company_id'])
        op.create_index('ix_payment_method_config_company_id',
                        'payment_method_config', ['company_id'], unique=False)

    # ── E: Make company_id NOT NULL on data tables ─────────────────────────
    if is_sqlite:
        # Batch mode recreates tables in SQLite since ALTER COLUMN is not supported.
        # users stays nullable so superadmin can exist without a company.
        for tbl in DATA_TABLES:
            with op.batch_alter_table(tbl) as batch_op:
                batch_op.alter_column('company_id', existing_type=sa.Integer(), nullable=False)
                batch_op.create_index(f'ix_{tbl}_company_id', ['company_id'], unique=False)

        with op.batch_alter_table('users') as batch_op:
            batch_op.create_index('ix_users_company_id', ['company_id'], unique=False)

    else:
        # PostgreSQL supports ALTER COLUMN directly.
        for tbl in DATA_TABLES:
            op.alter_column(tbl, 'company_id', existing_type=sa.Integer(), nullable=False)
            op.create_index(f'ix_{tbl}_company_id', tbl, ['company_id'], unique=False)

        op.create_index('ix_users_company_id', 'users', ['company_id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    if is_sqlite:
        with op.batch_alter_table('users') as batch_op:
            batch_op.drop_index('ix_users_company_id')
            batch_op.drop_column('company_id')

        for tbl in reversed(DATA_TABLES):
            with op.batch_alter_table(tbl) as batch_op:
                batch_op.drop_index(f'ix_{tbl}_company_id')
                batch_op.drop_column('company_id')

        # Recreate config tables without company_id (SQLite raw SQL)
        op.execute("""
            CREATE TABLE income_split_config_old (
                id INTEGER NOT NULL,
                name VARCHAR(30) NOT NULL,
                percentage NUMERIC(5, 4) NOT NULL,
                updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
                PRIMARY KEY (id),
                UNIQUE (name)
            )
        """)
        op.execute("""
            INSERT INTO income_split_config_old (id, name, percentage, updated_at)
            SELECT id, name, percentage, updated_at FROM income_split_config
        """)
        op.drop_table('income_split_config')
        op.execute("ALTER TABLE income_split_config_old RENAME TO income_split_config")
        op.create_index('ix_income_split_config_id', 'income_split_config', ['id'], unique=False)

        op.execute("""
            CREATE TABLE payment_method_config_old (
                id INTEGER NOT NULL,
                method VARCHAR(20) NOT NULL,
                commission_rate NUMERIC(5, 4) NOT NULL,
                updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
                PRIMARY KEY (id),
                UNIQUE (method)
            )
        """)
        op.execute("""
            INSERT INTO payment_method_config_old (id, method, commission_rate, updated_at)
            SELECT id, method, commission_rate, updated_at FROM payment_method_config
        """)
        op.drop_table('payment_method_config')
        op.execute("ALTER TABLE payment_method_config_old RENAME TO payment_method_config")
        op.create_index('ix_payment_method_config_id', 'payment_method_config', ['id'], unique=False)

    else:
        # PostgreSQL downgrade
        op.drop_index('ix_users_company_id', table_name='users')
        op.drop_column('users', 'company_id')

        for tbl in reversed(DATA_TABLES):
            op.drop_index(f'ix_{tbl}_company_id', table_name=tbl)
            op.drop_column(tbl, 'company_id')

        # income_split_config: restore single-col unique on name
        op.drop_constraint('uq_split_name_company', 'income_split_config', type_='unique')
        op.drop_index('ix_income_split_config_company_id', table_name='income_split_config')
        op.create_unique_constraint(None, 'income_split_config', ['name'])
        op.drop_column('income_split_config', 'company_id')

        # payment_method_config: restore single-col unique on method
        op.drop_constraint('uq_payment_method_company', 'payment_method_config', type_='unique')
        op.drop_index('ix_payment_method_config_company_id', table_name='payment_method_config')
        op.create_unique_constraint(None, 'payment_method_config', ['method'])
        op.drop_column('payment_method_config', 'company_id')

    # Drop companies table (both dialects)
    op.drop_index(op.f('ix_companies_slug'), table_name='companies')
    op.drop_index(op.f('ix_companies_id'), table_name='companies')
    op.drop_table('companies')
