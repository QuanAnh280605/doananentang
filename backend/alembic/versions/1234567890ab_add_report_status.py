"""add report status

Revision ID: 1234567890ab
Revises: a3f1c8e92b4d
Create Date: 2026-05-20 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1234567890ab'
down_revision: Union[str, None] = 'a3f1c8e92b4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first if it doesn't exist
    report_status_enum = postgresql.ENUM('pending', 'resolved', 'dismissed', name='report_status')
    report_status_enum.create(op.get_bind(), checkfirst=True)
    
    op.add_column('post_reports', sa.Column('status', report_status_enum, server_default='pending', nullable=False))


def downgrade() -> None:
    op.drop_column('post_reports', 'status')
    
    report_status_enum = postgresql.ENUM('pending', 'resolved', 'dismissed', name='report_status')
    report_status_enum.drop(op.get_bind(), checkfirst=True)
