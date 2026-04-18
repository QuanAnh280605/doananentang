from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import NotificationType, notification_type_enum
from app.models.db_types import UUID_TYPE, uuid_pk


class Notification(Base):
  __tablename__ = 'notifications'
  __table_args__ = (
    CheckConstraint(
      "((CASE WHEN post_id IS NOT NULL THEN 1 ELSE 0 END) + "
      "(CASE WHEN comment_id IS NOT NULL THEN 1 ELSE 0 END) + "
      "(CASE WHEN message_id IS NOT NULL THEN 1 ELSE 0 END) + "
      "(CASE WHEN related_user_id IS NOT NULL THEN 1 ELSE 0 END)) = 1",
      name='ck_notifications_exactly_one_related_reference',
    ),
    Index('idx_notifications_receiver_created_at', 'receiver_id', 'created_at'),
    Index('idx_notifications_actor_id', 'actor_id'),
  )

  id: Mapped[int] = uuid_pk('id')
  receiver_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  actor_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  type: Mapped[NotificationType] = mapped_column(notification_type_enum, nullable=False)
  post_id: Mapped[int | None] = mapped_column(
    UUID_TYPE,
    ForeignKey('posts.id', ondelete='CASCADE'),
    nullable=True,
  )
  comment_id: Mapped[int | None] = mapped_column(
    UUID_TYPE,
    ForeignKey('comments.id', ondelete='CASCADE'),
    nullable=True,
  )
  message_id: Mapped[int | None] = mapped_column(
    UUID_TYPE,
    ForeignKey('messages.id', ondelete='CASCADE'),
    nullable=True,
  )
  related_user_id: Mapped[int | None] = mapped_column(
    UUID_TYPE,
    ForeignKey('users.id', ondelete='CASCADE'),
    nullable=True,
  )
  is_read: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

  @property
  def notification_id(self) -> int:
    return self.id
