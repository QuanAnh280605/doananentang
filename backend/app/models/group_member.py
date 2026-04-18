from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class ChatMember(Base):
  __tablename__ = 'chat_members'
  __table_args__ = (
    PrimaryKeyConstraint('chat_id', 'user_id'),
    Index('idx_chat_members_user_id', 'user_id'),
  )

  chat_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  role: Mapped[str] = mapped_column(String(50), nullable=False, default='member', server_default='member')
  joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


GroupMember = ChatMember
