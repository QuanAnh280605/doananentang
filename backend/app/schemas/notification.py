from datetime import datetime

from pydantic import BaseModel, ConfigDict


NOTIFICATION_CREATED_EVENT = 'notification-created'


class NotificationRead(BaseModel):
  id: int
  receiver_id: int
  actor_id: int
  type: str
  post_id: int | None = None
  comment_id: int | None = None
  message_id: int | None = None
  related_user_id: int | None = None
  target_post_id: int | None = None
  actor_name: str | None = None
  actor_avatar_url: str | None = None
  is_read: bool
  created_at: datetime

  model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class NotificationListResponse(BaseModel):
  items: list[NotificationRead]
  unread_count: int


class NotificationCreatedEvent(NotificationRead):
  pass
