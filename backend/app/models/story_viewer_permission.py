from sqlalchemy import ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class StoryViewerPermission(Base):
  __tablename__ = 'story_viewer_permissions'
  __table_args__ = (
    PrimaryKeyConstraint('story_id', 'user_id'),
  )

  story_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('stories.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
