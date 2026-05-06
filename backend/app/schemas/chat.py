from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserSearchRead


class CreateDirectChatRequest(BaseModel):
  target_user_id: int


class SendMessageRequest(BaseModel):
  content: str


class MessageRead(BaseModel):
  id: int
  chat_id: int
  sender_id: int
  content: str | None
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)


class DirectChatRead(BaseModel):
  chat_id: int
  participant_user_id: int
  created_at: datetime


class ChatListItemRead(BaseModel):
  chat_id: int
  participant: UserSearchRead
  latest_message: MessageRead | None = None
  updated_at: datetime
