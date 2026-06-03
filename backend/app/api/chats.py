import logging
import shutil
import uuid
from pathlib import Path

from anyio import from_thread
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
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
  count_chats_for_user,
  list_chats_for_user,
  create_group_chat,
  delete_chat,
  remove_chat_member,
  get_read_message_ids_for_sender,
)
from app.crud.user import get_user_by_id
from app.models.group_member import ChatMember
from app.models.message import Message
from app.models.message_media import MessageMedia
from app.models.message_read import MessageStatus
from app.models.db_enums import MessageStatusType
from app.models.user import User
from app.realtime import socket_server
from app.schemas.chat import (
  MESSAGE_CREATED_EVENT,
  MESSAGE_DELETED_EVENT,
  ChatListItemRead,
  ChatReadStatusRead,
  CreateDirectChatRequest,
  DirectChatRead,
  MessageRead,
  PaginatedChatsResponse,
  PaginatedMessagesResponse,
  SendMessageRequest,
  CreateGroupChatRequest,
  GroupChatRead,
)
from app.schemas.user import UserSearchRead
from app.services.notification import create_social_notification

router = APIRouter()
logger = logging.getLogger(__name__)

CHAT_MEDIA_DIR = Path('uploads') / 'chats'


def _get_message_media(db: Session, message_id: int) -> MessageMedia | None:
  """Lấy media đầu tiên của tin nhắn (nếu có)."""
  return db.scalar(select(MessageMedia).where(MessageMedia.message_id == message_id))


def _get_sender_name(db: Session, sender_id: int) -> str | None:
  """Lấy tên đầy đủ của người gửi."""
  user = db.get(User, sender_id)
  if user:
    return f"{user.first_name} {user.last_name}".strip()
  return None


def _build_message_read(db: Session, message, sender_name: str | None = None) -> MessageRead:
  """Xây dựng MessageRead kèm media_url, media_type và sender_name."""
  if sender_name is None:
    sender_name = _get_sender_name(db, message.sender_id)

  if getattr(message, 'is_deleted', False):
    return MessageRead(
      id=message.id,
      chat_id=message.chat_id,
      sender_id=message.sender_id,
      sender_name=sender_name,
      content=None,
      media_url=None,
      media_type=None,
      is_deleted=True,
      created_at=message.created_at,
    )

  media = _get_message_media(db, message.id)
  return MessageRead(
    id=message.id,
    chat_id=message.chat_id,
    sender_id=message.sender_id,
    sender_name=sender_name,
    content=message.content,
    media_url=media.file_url if media else None,
    media_type=media.type.value if media else None,
    is_deleted=False,
    created_at=message.created_at,
  )


async def _emit_message_created_to_user_rooms(payload: dict[str, object], user_ids: list[int]) -> None:
  for user_id in user_ids:
    await socket_server.sio.emit(MESSAGE_CREATED_EVENT, payload, room=socket_server.get_user_room_name(user_id))


async def _emit_message_deleted_to_user_rooms(payload: dict[str, object], user_ids: list[int]) -> None:
  for user_id in user_ids:
    await socket_server.sio.emit(MESSAGE_DELETED_EVENT, payload, room=socket_server.get_user_room_name(user_id))

@router.get('', response_model=PaginatedChatsResponse)
def list_chats_endpoint(
  page: int = Query(1, ge=1),
  page_size: int = Query(20, ge=1, le=50),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> PaginatedChatsResponse:
  total = count_chats_for_user(db, current_user.id)
  total_pages = (total + page_size - 1) // page_size if total > 0 else 0
  skip = (page - 1) * page_size
  threads = list_chats_for_user(db, current_user.id, skip=skip, limit=page_size)

  # Batch-fetch sender names for latest messages
  latest_sender_ids = {thread.latest_message.sender_id for thread in threads if thread.latest_message is not None}
  sender_map: dict[int, str] = {}
  if latest_sender_ids:
    users = db.scalars(select(User).where(User.id.in_(latest_sender_ids))).all()
    sender_map = {u.id: f"{u.first_name} {u.last_name}".strip() for u in users}

  # Batch-fetch member counts for group chats
  group_chat_ids = [thread.chat.id for thread in threads if thread.chat.is_group]
  member_count_map: dict[int, int] = {}
  if group_chat_ids:
    from sqlalchemy import func as sqlfunc
    rows = db.execute(
      select(ChatMember.chat_id, sqlfunc.count(ChatMember.user_id))
      .where(ChatMember.chat_id.in_(group_chat_ids))
      .group_by(ChatMember.chat_id)
    ).all()
    member_count_map = {chat_id: count for chat_id, count in rows}

  items = [
    ChatListItemRead(
      chat_id=thread.chat.id,
      participant=UserSearchRead.model_validate(thread.participant) if thread.participant is not None else None,
      is_group=thread.chat.is_group,
      group_name=thread.chat.group_name,
      avatar_url=thread.chat.avatar_url,
      member_count=member_count_map.get(thread.chat.id) if thread.chat.is_group else None,
      latest_message=_build_message_read(db, thread.latest_message, sender_name=sender_map.get(thread.latest_message.sender_id)) if thread.latest_message is not None else None,
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


@router.post('/group', response_model=GroupChatRead, status_code=status.HTTP_201_CREATED)
def create_group_chat_endpoint(
  payload: CreateGroupChatRequest,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> GroupChatRead:
  if not payload.group_name.strip():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Group name cannot be empty')

  if not payload.user_ids:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Group must have at least one other member')

  chat = create_group_chat(db, current_user.id, payload.group_name, payload.user_ids)
  member_ids = get_chat_member_user_ids(db, chat.id)
  return GroupChatRead(chat_id=chat.id, group_name=chat.group_name, is_group=chat.is_group, avatar_url=chat.avatar_url, member_count=len(member_ids), created_at=chat.created_at)


@router.post('/upload-media', status_code=status.HTTP_201_CREATED)
def upload_chat_media(
  file: UploadFile = File(...),
  current_user: User = Depends(get_current_user),
):
  """Tải lên ảnh hoặc video cho tin nhắn chat."""
  content_type = file.content_type or ''
  if not (content_type.startswith('image/') or content_type.startswith('video/')):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"File '{file.filename}' không phải là ảnh hoặc video hợp lệ."
    )

  CHAT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
  file_ext = file.filename.split('.')[-1] if file.filename else 'jpg'
  unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
  file_path = CHAT_MEDIA_DIR / unique_filename

  try:
    with file_path.open('wb') as buffer:
      shutil.copyfileobj(file.file, buffer)
  except IOError as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Lỗi lưu file: {str(e)}"
    )
  finally:
    file.file.close()

  return {
    'url': f'/static/chats/{unique_filename}',
    'media_type': content_type,
  }

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


@router.get('/has-unread-messages', response_model=bool)
def has_unread_messages_endpoint(
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> bool:
  return has_unread_messages(db, current_user.id)


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
  messages = list_chat_messages(db, chat_id, skip=skip, limit=page_size)

  # Batch-fetch sender names to avoid N+1 queries
  sender_ids = list({msg.sender_id for msg in messages})
  sender_map: dict[int, str] = {}
  if sender_ids:
    users = db.scalars(select(User).where(User.id.in_(sender_ids))).all()
    sender_map = {u.id: f"{u.first_name} {u.last_name}".strip() for u in users}

  # Batch-fetch read message IDs sent by current_user
  my_message_ids = [msg.id for msg in messages if msg.sender_id == current_user.id]
  read_message_ids = get_read_message_ids_for_sender(db, my_message_ids, current_user.id)

  # Batch-fetch read statuses for incoming messages to current_user
  other_message_ids = [msg.id for msg in messages if msg.sender_id != current_user.id]
  user_read_message_ids = set()
  if other_message_ids:
    user_read_message_ids = set(db.scalars(
      select(MessageStatus.message_id)
      .where(
        MessageStatus.message_id.in_(other_message_ids),
        MessageStatus.user_id == current_user.id,
        MessageStatus.status == MessageStatusType.READ,
      )
    ).all())

  items = []
  for message in messages:
    msg_read = _build_message_read(db, message, sender_name=sender_map.get(message.sender_id))
    if message.sender_id == current_user.id:
      msg_read.is_read = message.id in read_message_ids
    else:
      msg_read.is_read = message.id in user_read_message_ids
    items.append(msg_read)

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
    message = create_chat_message(
      db,
      chat_id,
      current_user.id,
      content=payload.content,
      media_url=payload.media_url,
    )
  except ValueError as error:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

  sender_name = f"{current_user.first_name} {current_user.last_name}".strip()
  response = _build_message_read(db, message, sender_name=sender_name)

  member_ids = get_chat_member_user_ids(db, chat_id)
  # Bỏ thông báo tin nhắn trong phần Alerts chung (Bình luận/Like/Follow)
  # nhưng vẫn giữ nguyên Socket emit để tin nhắn realtime và chấm đỏ ở phần Inbox
  # for member_id in member_ids:
  #   if member_id != current_user.id:
  #     create_social_notification(
  #       db,
  #       receiver_id=member_id,
  #       actor_id=current_user.id,
  #       type='message',
  #       message_id=message.id,
  #     )

  try:
    response_payload = response.model_dump(mode='json')
    # Run the async socket emission safely from this synchronous worker thread
    from_thread.run(_emit_message_created_to_user_rooms, response_payload, member_ids)
  except Exception:
    logger.exception('Failed to emit message-created event', extra={'chat_id': chat_id, 'message_id': response.id})
  return response


@router.delete('/{chat_id}', status_code=status.HTTP_200_OK)
def delete_chat_endpoint(
  chat_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  delete_chat(db, chat_id)
  return {'status': 'success', 'message': 'Đã xóa cuộc trò chuyện thành công'}


@router.post('/{chat_id}/leave', status_code=status.HTTP_200_OK)
def leave_group_endpoint(
  chat_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Rời khỏi nhóm chat."""
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not chat.is_group:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot leave a direct chat')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  removed = remove_chat_member(db, chat_id, current_user.id)
  if not removed:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Failed to leave group')

  return {'status': 'success', 'message': 'Đã rời khỏi nhóm thành công'}


@router.post('/{chat_id}/avatar', response_model=GroupChatRead)
def upload_group_avatar_endpoint(
  chat_id: int,
  file: UploadFile = File(...),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> GroupChatRead:
  """Tải lên ảnh đại diện cho nhóm chat."""
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not chat.is_group:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot set avatar for direct chat')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  content_type = file.content_type or ''
  if not content_type.startswith('image/'):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"File '{file.filename}' không phải là ảnh hợp lệ."
    )

  # Tạo thư mục lưu trữ avatar nhóm chat
  AVATARS_DIR = Path('uploads') / 'avatars'
  AVATARS_DIR.mkdir(parents=True, exist_ok=True)
  file_ext = file.filename.split('.')[-1] if file.filename else 'jpg'
  unique_filename = f"group_{chat_id}_{uuid.uuid4().hex}.{file_ext}"
  file_path = AVATARS_DIR / unique_filename

  try:
    with file_path.open('wb') as buffer:
      shutil.copyfileobj(file.file, buffer)
  except IOError as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Lỗi lưu file: {str(e)}"
    )
  finally:
    file.file.close()

  # Cập nhật avatar_url vào DB
  chat.avatar_url = f'/static/avatars/{unique_filename}'
  db.add(chat)
  db.commit()
  db.refresh(chat)

  member_ids = get_chat_member_user_ids(db, chat.id)
  return GroupChatRead(
    chat_id=chat.id,
    group_name=chat.group_name,
    is_group=chat.is_group,
    avatar_url=chat.avatar_url,
    member_count=len(member_ids),
    created_at=chat.created_at,
  )


@router.delete('/{chat_id}/messages/{message_id}', status_code=status.HTTP_200_OK)
def delete_chat_message_endpoint(
  chat_id: int,
  message_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Thu hồi (xóa) một tin nhắn trong cuộc trò chuyện."""
  chat = get_chat_by_id(db, chat_id)
  if chat is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found')

  if not is_chat_member(db, chat_id, current_user.id):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You are not a member of this chat')

  message = db.get(Message, message_id)
  if message is None or message.chat_id != chat_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Message not found')

  if message.sender_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only delete your own messages')

  if message.is_deleted:
    return {'status': 'success', 'message': 'Tin nhắn đã được xóa trước đó'}

  message.is_deleted = True
  db.commit()

  # Phát sự kiện realtime qua Socket.IO
  member_ids = get_chat_member_user_ids(db, chat_id)
  try:
    payload = {
      'chat_id': chat_id,
      'message_id': message_id,
    }
    from_thread.run(_emit_message_deleted_to_user_rooms, payload, member_ids)
  except Exception:
    logger.exception('Failed to emit message-deleted event', extra={'chat_id': chat_id, 'message_id': message_id})

  return {'status': 'success', 'message': 'Đã xóa tin nhắn thành công'}



