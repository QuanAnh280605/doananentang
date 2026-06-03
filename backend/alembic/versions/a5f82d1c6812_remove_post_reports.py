"""remove post reports

Revision ID: a5f82d1c6812
Revises: 79d8ced5586e
Create Date: 2026-06-03 22:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'a5f82d1c6812'
down_revision = '79d8ced5586e'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Drop index
    op.drop_index('idx_post_reports_post_id', table_name='post_reports')
    # 2. Drop table
    op.drop_table('post_reports')
    # 3. Drop column
    op.drop_column('posts', 'reported_count')

def downgrade() -> None:
    # 1. Add column back
    op.add_column('posts', sa.Column('reported_count', sa.Integer(), server_default=sa.text('0'), nullable=False))
    # 2. Create table back
    op.create_table('post_reports',
    sa.Column('post_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('post_id', 'user_id')
    )
    # 3. Create index back
    op.create_index('idx_post_reports_post_id', 'post_reports', ['post_id'], unique=False)
