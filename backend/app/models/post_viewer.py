from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class PostViewer(Base):
  __tablename__ = 'post_viewers'
  __table_args__ = (
    PrimaryKeyConstraint('post_id', 'user_id'),
  )

  post_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
