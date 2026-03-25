"""expand users for auth

Revision ID: 0002_expand_users_for_auth
Revises: 0001_create_users_table
Create Date: 2026-03-25 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


revision: str = '0002_expand_users_for_auth'
down_revision: Union[str, None] = '0001_create_users_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))
  op.add_column('users', sa.Column('hashed_password', sa.String(length=255), nullable=True))
  op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
  op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True, server_default=''))
  op.add_column('users', sa.Column('birth_date', sa.Date(), nullable=True))
  op.add_column('users', sa.Column('gender', sa.String(length=20), nullable=False, server_default='custom'))
  op.add_column(
    'users',
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
  )

  op.execute(
    """
    UPDATE users
    SET
      first_name = CASE
        WHEN position(' ' in btrim(full_name)) > 0 THEN split_part(btrim(full_name), ' ', 1)
        ELSE btrim(full_name)
      END,
      last_name = CASE
        WHEN position(' ' in btrim(full_name)) > 0 THEN btrim(substring(btrim(full_name) from position(' ' in btrim(full_name)) + 1))
        ELSE ''
      END,
      hashed_password = 'migrated-user-no-password'
    """
  )

  with op.batch_alter_table('users') as batch_op:
    batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=False)
    batch_op.alter_column('first_name', existing_type=sa.String(length=100), nullable=False)
    batch_op.alter_column('last_name', existing_type=sa.String(length=100), nullable=False, server_default=None)
    batch_op.drop_column('full_name')
    batch_op.create_unique_constraint('uq_users_phone', ['phone'])
    batch_op.create_check_constraint('ck_users_email_or_phone', 'email IS NOT NULL OR phone IS NOT NULL')
    batch_op.create_check_constraint("ck_users_gender", "gender IN ('female', 'male', 'custom')")


def downgrade() -> None:
  connection = op.get_bind()
  phone_only_users = connection.execute(text("SELECT COUNT(*) FROM users WHERE email IS NULL AND phone IS NOT NULL")).scalar_one()
  if phone_only_users > 0:
    raise RuntimeError('Cannot downgrade while phone-only users exist')

  with op.batch_alter_table('users') as batch_op:
    batch_op.add_column(sa.Column('full_name', sa.String(length=255), nullable=True))

  op.execute(
    """
    UPDATE users
    SET full_name = trim(
      coalesce(first_name, '') ||
      CASE WHEN last_name IS NOT NULL AND last_name != '' THEN ' ' || last_name ELSE '' END
    )
    """
  )

  with op.batch_alter_table('users') as batch_op:
    batch_op.alter_column('email', existing_type=sa.String(length=255), nullable=False)
    batch_op.alter_column('full_name', existing_type=sa.String(length=255), nullable=False)
    batch_op.drop_constraint('ck_users_gender', type_='check')
    batch_op.drop_constraint('ck_users_email_or_phone', type_='check')
    batch_op.drop_constraint('uq_users_phone', type_='unique')
    batch_op.drop_column('updated_at')
    batch_op.drop_column('gender')
    batch_op.drop_column('birth_date')
    batch_op.drop_column('last_name')
    batch_op.drop_column('first_name')
    batch_op.drop_column('hashed_password')
    batch_op.drop_column('phone')
