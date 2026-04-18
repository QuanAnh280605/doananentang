from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import MediaType, media_type_enum
from app.models.db_types import UUID_TYPE, uuid_pk


class PostMedia(Base):
  __tablename__ = 'post_media'
  __table_args__ = (
    Index('idx_post_media_post_id', 'post_id'),
  )

  id: Mapped[int] = uuid_pk('id')
  post_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
  file_url: Mapped[str] = mapped_column(String(255), nullable=False)
  type: Mapped[MediaType] = mapped_column(media_type_enum, nullable=False)
  display_order: Mapped[int] = mapped_column(Integer(), nullable=False, default=1, server_default=text('1'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def media_id(self) -> int:
    return self.id
