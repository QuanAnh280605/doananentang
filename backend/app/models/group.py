from datetime import datetime

from sqlalchemy import Boolean, DateTime, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import uuid_pk


class Chat(Base):
  __tablename__ = 'chats'

  id: Mapped[int] = uuid_pk('id')
  group_name: Mapped[str | None] = mapped_column(nullable=True)
  is_group: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def chat_id(self) -> int:
    return self.id


Group = Chat
