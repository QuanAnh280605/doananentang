"""add refresh sessions table

Revision ID: 0003_add_refresh_sessions_table
Revises: 0002_expand_users_for_auth
Create Date: 2026-04-07 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003_add_refresh_sessions_table'
down_revision: Union[str, None] = '0002_expand_users_for_auth'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  op.create_table(
    'refresh_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_id', sa.String(length=36), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token_id'),
  )
  op.create_index(op.f('ix_refresh_sessions_expires_at'), 'refresh_sessions', ['expires_at'], unique=False)
  op.create_index(op.f('ix_refresh_sessions_token_id'), 'refresh_sessions', ['token_id'], unique=False)
  op.create_index(op.f('ix_refresh_sessions_user_id'), 'refresh_sessions', ['user_id'], unique=False)


def downgrade() -> None:
  op.drop_index(op.f('ix_refresh_sessions_user_id'), table_name='refresh_sessions')
  op.drop_index(op.f('ix_refresh_sessions_token_id'), table_name='refresh_sessions')
  op.drop_index(op.f('ix_refresh_sessions_expires_at'), table_name='refresh_sessions')
  op.drop_table('refresh_sessions')
