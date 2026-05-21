"""add revoked_at to login_sessions

Revision ID: a3f1c8e92b4d
Revises: 8a8aee65771e
Create Date: 2026-05-13 20:30:00.000000
"""
from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = 'a3f1c8e92b4d'
down_revision = 'f4a6c2b9d001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('login_sessions', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('login_sessions', 'revoked_at')
