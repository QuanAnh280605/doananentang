"""add missing fields to users

Revision ID: 0004_add_missing_fields_to_users
Revises: 0003_add_refresh_sessions_table
Create Date: 2026-04-08 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0004_add_missing_fields_to_users'
down_revision: Union[str, None] = '0003_add_refresh_sessions_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  with op.batch_alter_table('users') as batch_op:
    batch_op.add_column(sa.Column('username', sa.String(length=100), nullable=True))
    batch_op.add_column(sa.Column('bio', sa.Text(), nullable=True))
    batch_op.add_column(sa.Column('avatar_url', sa.String(length=255), nullable=True))
    batch_op.add_column(sa.Column('city', sa.String(length=100), nullable=True))
    batch_op.add_column(sa.Column('country', sa.String(length=100), nullable=True))
    batch_op.add_column(sa.Column('role', sa.String(length=50), nullable=False, server_default='user'))
    batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    batch_op.create_unique_constraint('uq_users_username', ['username'])


def downgrade() -> None:
  with op.batch_alter_table('users') as batch_op:
    batch_op.drop_constraint('uq_users_username', type_='unique')
    batch_op.drop_column('is_active')
    batch_op.drop_column('role')
    batch_op.drop_column('country')
    batch_op.drop_column('city')
    batch_op.drop_column('avatar_url')
    batch_op.drop_column('bio')
    batch_op.drop_column('username')
