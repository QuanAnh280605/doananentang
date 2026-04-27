from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.db_enums import VisibilityLevel, visibility_level_enum
from app.models.db_types import UUID_TYPE, uuid_pk


class Post(Base):
  __tablename__ = 'posts'
  __table_args__ = (
    Index('idx_posts_author_created_at', 'author_id', 'created_at'),
  )

  id: Mapped[int] = uuid_pk('id')
  author_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  content: Mapped[str | None] = mapped_column(Text(), nullable=True)
  visibility: Mapped[VisibilityLevel] = mapped_column(
    visibility_level_enum,
    nullable=False,
    default=VisibilityLevel.PUBLIC,
    server_default='public',
  )
  reported_count: Mapped[int] = mapped_column(Integer(), nullable=False, default=0, server_default=text('0'))
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  # Quan hệ 1-N: Post -> PostMedia
  media: Mapped[list["PostMedia"]] = relationship(
      "PostMedia", 
      backref="post", 
      cascade="all, delete-orphan",
      order_by="PostMedia.display_order"
  )

  # Quan hệ N-1: Post -> User (tác giả)
  author: Mapped["User"] = relationship(
      "User",
      foreign_keys=[author_id],
      lazy="joined",
  )

  @property
  def post_id(self) -> int:
    return self.id
