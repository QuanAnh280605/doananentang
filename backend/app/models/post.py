from datetime import datetime

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Text, JSON, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.db_enums import VisibilityLevel, visibility_level_enum
from app.models.db_types import UUID_TYPE, uuid_pk

if TYPE_CHECKING:
  from app.models.post_media import PostMedia
  from app.models.post_tag import PostTag
  from app.models.user import User


class Post(Base):
  __tablename__ = 'posts'
  __table_args__ = (
    Index('idx_posts_author_created_at', 'author_id', 'created_at'),
    Index(
      'idx_posts_content_fts',
      func.to_tsvector(text("'simple'"), text('content')),
      postgresql_using='gin'
    ).ddl_if(dialect='postgresql'),
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
  feeling: Mapped[str | None] = mapped_column(Text(), nullable=True)
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  gif_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
  location_name: Mapped[str | None] = mapped_column(Text(), nullable=True)
  location_lat: Mapped[float | None] = mapped_column(nullable=True)
  location_lng: Mapped[float | None] = mapped_column(nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  # Quan hệ 1-N: Post -> PostTag
  tagged_users: Mapped[list["PostTag"]] = relationship(
      "PostTag",
      back_populates="post",
      cascade="all, delete-orphan",
  )

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

  shared_post_id: Mapped[int | None] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='SET NULL'), nullable=True)

  # Quan hệ N-1: Post -> Post (bài gốc được share)
  shared_post: Mapped["Post"] = relationship(
      "Post",
      remote_side=[id],
      foreign_keys=[shared_post_id],
      lazy="joined",
  )

  @property
  def post_id(self) -> int:
    return self.id
