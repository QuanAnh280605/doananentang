from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class Like(Base):
  __tablename__ = 'likes'
  __table_args__ = (
    PrimaryKeyConstraint('post_id', 'user_id'),
    Index('idx_likes_user_id', 'user_id'),
  )

  post_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CommentLike(Base):
  __tablename__ = 'comment_likes'
  __table_args__ = (
    PrimaryKeyConstraint('comment_id', 'user_id'),
    Index('idx_comment_likes_user_id', 'user_id'),
  )

  comment_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('comments.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
