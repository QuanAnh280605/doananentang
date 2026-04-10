from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, desc, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notification(Base):
  __tablename__ = 'notifications'
  __table_args__ = (
    Index('idx_notifications_user_id', 'user_id'),
    Index('idx_notifications_unread', 'user_id', desc('created_at'), postgresql_where=text('is_read = FALSE')),
  )

  id: Mapped[int] = mapped_column(primary_key=True)
  user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  type: Mapped[str] = mapped_column(String(50), nullable=False)
  actor_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
  post_id: Mapped[int | None] = mapped_column(ForeignKey('posts.id', ondelete='CASCADE'), nullable=True)
  comment_id: Mapped[int | None] = mapped_column(ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
  message_id: Mapped[int | None] = mapped_column(ForeignKey('messages.id', ondelete='CASCADE'), nullable=True)
  is_read: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
