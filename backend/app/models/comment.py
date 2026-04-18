from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE, uuid_pk


class Comment(Base):
  __tablename__ = 'comments'
  __table_args__ = (
    Index('idx_comments_post_id', 'post_id'),
    Index('idx_comments_parent_comment_id', 'parent_comment_id'),
    Index('idx_comments_post_created_at', 'post_id', 'created_at'),
  )

  id: Mapped[int] = uuid_pk('id')
  post_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
  author_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  parent_comment_id: Mapped[int | None] = mapped_column(
    UUID_TYPE,
    ForeignKey('comments.id', ondelete='CASCADE'),
    nullable=True,
  )
  content: Mapped[str] = mapped_column(Text(), nullable=False)
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def comment_id(self) -> int:
    return self.id
