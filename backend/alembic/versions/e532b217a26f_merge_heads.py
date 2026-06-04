"""merge heads

Revision ID: e532b217a26f
Revises: c5175e175ad2, a5f82d1c6812
Create Date: 2026-06-04 08:40:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e532b217a26f'
down_revision = ('c5175e175ad2', 'a5f82d1c6812')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
