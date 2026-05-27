"""merge all heads

Revision ID: e4b37d45f32b
Revises: 0c1761b7ec27, 046464c9fa3e
Create Date: 2026-05-27 17:35:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e4b37d45f32b'
down_revision = ('0c1761b7ec27', '046464c9fa3e')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
