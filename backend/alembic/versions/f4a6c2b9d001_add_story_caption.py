"""Add story caption

Revision ID: f4a6c2b9d001
Revises: 8a8aee65771e
Create Date: 2026-05-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4a6c2b9d001'
down_revision = 'a3f1c8e92b4d'
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column('stories', sa.Column('caption', sa.Text(), nullable=True))


def downgrade() -> None:
  op.drop_column('stories', 'caption')
