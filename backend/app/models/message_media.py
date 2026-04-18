from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import MediaType, media_type_enum
from app.models.db_types import UUID_TYPE, uuid_pk


class MessageMedia(Base):
  __tablename__ = 'message_media'
  __table_args__ = (
    Index('idx_message_media_message_id', 'message_id'),
  )

  id: Mapped[int] = uuid_pk('id')
  message_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)

  @property
  def media_id(self) -> int:
    return self.id
  file_url: Mapped[str] = mapped_column(String(255), nullable=False)
  type: Mapped[MediaType] = mapped_column(media_type_enum, nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
