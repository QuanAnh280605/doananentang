from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.db_enums import NotificationType


class ActorRead(BaseModel):
  id: int
  first_name: str
  last_name: str
  full_name: str
  avatar_url: str | None = None

  model_config = ConfigDict(from_attributes=True)


class NotificationRead(BaseModel):
  id: int
  type: NotificationType
  is_read: bool
  created_at: datetime
  actor: ActorRead
  post_id: int | None = None
  comment_id: int | None = None
  message_id: int | None = None
  related_user_id: int | None = None

  model_config = ConfigDict(from_attributes=True)


class PaginatedNotificationsResponse(BaseModel):
  items: list[NotificationRead]
  total: int
  page: int
  page_size: int
  total_pages: int
  unread_count: int


class UnreadCountResponse(BaseModel):
  unread_count: int


class MarkReadRequest(BaseModel):
  is_read: bool = True
