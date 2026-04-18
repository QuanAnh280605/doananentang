from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import MediaType, VisibilityLevel, media_type_enum, visibility_level_enum
from app.models.db_types import UUID_TYPE, uuid_pk


class Story(Base):
  __tablename__ = 'stories'
  __table_args__ = (
    Index('idx_stories_user_id', 'user_id'),
  )

  id: Mapped[int] = uuid_pk('id')
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  file_url: Mapped[str] = mapped_column(String(255), nullable=False)
  type: Mapped[MediaType] = mapped_column(media_type_enum, nullable=False)
  visibility: Mapped[VisibilityLevel] = mapped_column(
    visibility_level_enum,
    nullable=False,
    default=VisibilityLevel.PUBLIC,
    server_default='public',
  )
  expired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def story_id(self) -> int:
    return self.id
