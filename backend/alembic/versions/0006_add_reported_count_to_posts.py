"""add reported count to posts

Revision ID: 0006_add_reported_count_to_posts
Revises: 0005_add_social_tables
Create Date: 2026-04-10 00:00:01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006_add_reported_count_to_posts'
down_revision: Union[str, None] = '0005_add_social_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  with op.batch_alter_table('posts') as batch_op:
    batch_op.add_column(sa.Column('reported_count', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
  with op.batch_alter_table('posts') as batch_op:
    batch_op.drop_column('reported_count')
