from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserSearchRead


MESSAGE_CREATED_EVENT = 'message-created'


class CreateDirectChatRequest(BaseModel):
  target_user_id: int


class SendMessageRequest(BaseModel):
  content: str


class MessageRead(BaseModel):
  id: int
  chat_id: int
  sender_id: int
  content: str
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


class ChatListItemRead(BaseModel):
  chat_id: int
  participant: UserSearchRead
  latest_message: MessageRead | None = None
  updated_at: datetime
  unread_count: int


class PaginatedChatsResponse(BaseModel):
  items: list[ChatListItemRead]
  total: int
  page: int
  page_size: int
  total_pages: int


class ChatReadStatusRead(BaseModel):
  chat_id: int
  unread_count: int
