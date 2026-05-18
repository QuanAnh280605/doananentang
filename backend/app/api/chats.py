import logging

from anyio import from_thread
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.chat import (
  count_direct_chats_for_user,
  count_chat_messages,
  create_chat_message,
  get_chat_member_user_ids,
  get_chat_by_id,
  get_or_create_direct_chat,
  has_unread_messages,
  is_chat_member,
  list_chat_messages,
  list_direct_chats_for_user,
  mark_chat_messages_read,
)
from app.crud.user import get_user_by_id
from app.models.user import User
from app.realtime import socket_server
from app.schemas.chat import (
  MESSAGE_CREATED_EVENT,
  ChatListItemRead,
  ChatReadStatusRead,
  CreateDirectChatRequest,
  DirectChatRead,
  MessageRead,
  PaginatedChatsResponse,
  PaginatedMessagesResponse,
  SendMessageRequest,
)
from app.schemas.user import UserSearchRead

router = APIRouter()
logger = logging.getLogger(__name__)


async def _emit_message_created_to_user_rooms(payload: dict[str, object], user_ids: list[int]) -> None:
  for user_id in user_ids:
    await socket_server.sio.emit(MESSAGE_CREATED_EVENT, payload, room=socket_server.get_user_room_name(user_id))


@router.get('', response_model=PaginatedChatsResponse)
def list_chats_endpoint(
  page: int = Query(1, ge=1),
  page_size: int = Query(20, ge=1, le=50),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> PaginatedChatsResponse:
  total = count_direct_chats_for_user(db, current_user.id)
  total_pages = (total + page_size - 1) // page_size if total > 0 else 0
  skip = (page - 1) * page_size
  threads = list_direct_chats_for_user(db, current_user.id, skip=skip, limit=page_size)
  items = [
    ChatListItemRead(
      chat_id=thread.chat.id,
      participant=UserSearchRead.model_validate(thread.participant),
      latest_message=MessageRead.model_validate(thread.latest_message) if thread.latest_message is not None else None,
      updated_at=thread.updated_at,
      unread_count=thread.unread_count,
    )
    for thread in threads
  ]

  return PaginatedChatsResponse(
    items=items,
    total=total,
    page=page,
    page_size=page_size,
    total_pages=total_pages,
  )


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


@router.post('/{chat_id}/read', response_model=ChatReadStatusRead)
def mark_chat_read_endpoint(
  chat_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> ChatReadStatusRead:
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  unread_count = mark_chat_messages_read(db, chat_id, current_user.id)
  return ChatReadStatusRead(chat_id=chat_id, unread_count=unread_count)


@router.get('/{chat_id}/messages', response_model=PaginatedMessagesResponse)
def list_chat_messages_endpoint(
  chat_id: int,
  page: int = Query(1, ge=1),
  page_size: int = Query(30, ge=1, le=50),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> PaginatedMessagesResponse:
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  total = count_chat_messages(db, chat_id)
  total_pages = (total + page_size - 1) // page_size if total > 0 else 0
  skip = (page - 1) * page_size
  items = [MessageRead.model_validate(message) for message in list_chat_messages(db, chat_id, skip=skip, limit=page_size)]

  return PaginatedMessagesResponse(
    items=items,
    total=total,
    page=page,
    page_size=page_size,
    total_pages=total_pages,
  )


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

  response = MessageRead.model_validate(message)
  try:
    response_payload = response.model_dump(mode='json')
    from_thread.run(_emit_message_created_to_user_rooms, response_payload, get_chat_member_user_ids(db, chat_id))
  except Exception:
    logger.exception('Failed to emit message-created event', extra={'chat_id': chat_id, 'message_id': response.id})
  return response

@router.get('/has-unread-messages', response_model=bool)
def has_unread_messages_endpoint(
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> bool:
  return has_unread_messages(db, current_user.id)
