from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import MessageStatusType, message_status_type_enum
from app.models.db_types import UUID_TYPE


class MessageStatus(Base):
  __tablename__ = 'message_status'
  __table_args__ = (
    PrimaryKeyConstraint('message_id', 'user_id'),
    Index('idx_message_status_user_id', 'user_id'),
  )

  message_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  status: Mapped[MessageStatusType] = mapped_column(
    message_status_type_enum,
    nullable=False,
    default=MessageStatusType.SENT,
    server_default='sent',
  )
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


MessageRead = MessageStatus
