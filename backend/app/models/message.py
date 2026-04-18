from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE, uuid_pk


class Message(Base):
  __tablename__ = 'messages'
  __table_args__ = (
    Index('idx_messages_chat_created_at', 'chat_id', 'created_at'),
  )

  id: Mapped[int] = uuid_pk('id')
  chat_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
  sender_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  content: Mapped[str | None] = mapped_column(Text(), nullable=True)
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def message_id(self) -> int:
    return self.id
