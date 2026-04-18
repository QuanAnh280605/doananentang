from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class StoryView(Base):
  __tablename__ = 'story_views'
  __table_args__ = (
    PrimaryKeyConstraint('story_id', 'user_id'),
    Index('idx_story_views_user_id', 'user_id'),
  )

  story_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('stories.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
