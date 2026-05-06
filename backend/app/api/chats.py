from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.chat import (
  create_chat_message,
  get_chat_by_id,
  get_or_create_direct_chat,
  is_chat_member,
  list_chat_messages,
  list_direct_chats_for_user,
)
from app.crud.user import get_user_by_id
from app.models.user import User
from app.schemas.chat import ChatListItemRead, CreateDirectChatRequest, DirectChatRead, MessageRead, SendMessageRequest
from app.schemas.user import UserSearchRead

router = APIRouter()


@router.get('', response_model=list[ChatListItemRead])
def list_chats_endpoint(
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> list[ChatListItemRead]:
  threads = list_direct_chats_for_user(db, current_user.id)
  return [
    ChatListItemRead(
      chat_id=thread.chat.id,
      participant=UserSearchRead.model_validate(thread.participant),
      latest_message=MessageRead.model_validate(thread.latest_message) if thread.latest_message is not None else None,
      updated_at=thread.updated_at,
    )
    for thread in threads
  ]


@router.post('/direct', response_model=DirectChatRead)
def create_direct_chat_endpoint(
  payload: CreateDirectChatRequest,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> DirectChatRead:
  if payload.target_user_id == current_user.id:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot create direct chat with yourself')

  target_user = get_user_by_id(db, payload.target_user_id)
  if target_user is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

  chat = get_or_create_direct_chat(db, current_user.id, payload.target_user_id)
  return DirectChatRead(chat_id=chat.id, participant_user_id=payload.target_user_id, created_at=chat.created_at)


@router.get('/{chat_id}/messages', response_model=list[MessageRead])
def list_chat_messages_endpoint(
  chat_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> list[MessageRead]:
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  return [MessageRead.model_validate(message) for message in list_chat_messages(db, chat_id)]


@router.post('/{chat_id}/messages', response_model=MessageRead)
def create_chat_message_endpoint(
  chat_id: int,
  payload: SendMessageRequest,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> MessageRead:
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  try:
    message = create_chat_message(db, chat_id, current_user.id, payload.content)
  except ValueError as error:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

  return MessageRead.model_validate(message)
