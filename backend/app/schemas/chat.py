from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserSearchRead


MESSAGE_CREATED_EVENT = 'message-created'


class CreateDirectChatRequest(BaseModel):
  target_user_id: int


class SendMessageRequest(BaseModel):
  content: str | None = None
  media_url: str | None = None


class MessageRead(BaseModel):
  id: int
  chat_id: int
  sender_id: int
  sender_name: str | None = None
  content: str | None = None
  media_url: str | None = None
  media_type: str | None = None
  is_read: bool = False
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)


class PaginatedMessagesResponse(BaseModel):
  items: list[MessageRead]
  total: int
  page: int
  page_size: int
  total_pages: int


class DirectChatRead(BaseModel):
  chat_id: int
  participant_user_id: int
  created_at: datetime


class CreateGroupChatRequest(BaseModel):
  group_name: str
  user_ids: list[int]


class GroupChatRead(BaseModel):
  chat_id: int
  group_name: str
  is_group: bool = True
  avatar_url: str | None = None
  member_count: int | None = None
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)


class ChatListItemRead(BaseModel):
  chat_id: int
  participant: UserSearchRead | None = None
  is_group: bool = False
  group_name: str | None = None
  avatar_url: str | None = None
  member_count: int | None = None
  latest_message: MessageRead | None = None
  updated_at: datetime
  unread_count: int

  model_config = ConfigDict(from_attributes=True)


class PaginatedChatsResponse(BaseModel):
  items: list[ChatListItemRead]
  total: int
  page: int
  page_size: int
  total_pages: int


class ChatReadStatusRead(BaseModel):
  chat_id: int
  unread_count: int

