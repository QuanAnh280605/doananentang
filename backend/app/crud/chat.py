from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.group import Chat
from app.models.group_member import ChatMember
from app.models.message import Message
from app.models.message_media import MessageMedia
from app.models.message_read import MessageStatus
from app.models.db_enums import MediaType, MessageStatusType
from app.models.user import User


@dataclass(slots=True)
class DirectChatThread:
  chat: Chat
  participant: User
  latest_message: Message | None
  updated_at: datetime
  unread_count: int


def _direct_chat_member_count_subquery(chat_id_column):
  return (
    select(func.count())
    .select_from(ChatMember)
    .where(ChatMember.chat_id == chat_id_column)
    .scalar_subquery()
  )


def normalize_message_content(content: str) -> str:
  normalized_content = content.strip()
  if not normalized_content:
    raise ValueError('Message content cannot be empty')
  return normalized_content


def get_chat_by_id(db: Session, chat_id: int) -> Chat | None:
  return db.get(Chat, chat_id)


def get_chat_room_name(chat_id: int) -> str:
  return f'chat:{chat_id}'


def get_chat_member_user_ids(db: Session, chat_id: int) -> list[int]:
  statement = select(ChatMember.user_id).where(ChatMember.chat_id == chat_id).order_by(ChatMember.user_id.asc())
  return list(db.scalars(statement).all())


def is_chat_member(db: Session, chat_id: int, user_id: int) -> bool:
  statement = select(ChatMember).where(ChatMember.chat_id == chat_id, ChatMember.user_id == user_id)
  return db.scalar(statement) is not None


def get_direct_chat_between_users(db: Session, first_user_id: int, second_user_id: int) -> Chat | None:
  first_member = aliased(ChatMember)
  second_member = aliased(ChatMember)
  statement = (
    select(Chat)
    .join(first_member, first_member.chat_id == Chat.id)
    .join(second_member, second_member.chat_id == Chat.id)
    .where(
      Chat.is_group.is_(False),
      first_member.user_id == first_user_id,
      second_member.user_id == second_user_id,
      _direct_chat_member_count_subquery(Chat.id) == 2,
    )
  )
  return db.scalar(statement)


def create_direct_chat(db: Session, first_user_id: int, second_user_id: int) -> Chat:
  chat = Chat(is_group=False)
  db.add(chat)
  db.flush()
  db.add_all(
    [
      ChatMember(chat_id=chat.id, user_id=first_user_id),
      ChatMember(chat_id=chat.id, user_id=second_user_id),
    ]
  )
  db.commit()
  db.refresh(chat)
  return chat


def get_or_create_direct_chat(db: Session, first_user_id: int, second_user_id: int) -> Chat:
  locked_user_ids = sorted({first_user_id, second_user_id})
  db.execute(
    select(User.id)
    .where(User.id.in_(locked_user_ids))
    .order_by(User.id.asc())
    .with_for_update()
  ).all()

  existing_chat = get_direct_chat_between_users(db, first_user_id, second_user_id)
  if existing_chat is not None:
    return existing_chat
  return create_direct_chat(db, first_user_id, second_user_id)


def count_direct_chats_for_user(db: Session, user_id: int) -> int:
  current_member = aliased(ChatMember)
  other_member = aliased(ChatMember)
  statement = (
    select(func.count())
    .select_from(Chat)
    .join(current_member, current_member.chat_id == Chat.id)
    .join(other_member, other_member.chat_id == Chat.id)
    .where(
      Chat.is_group.is_(False),
      current_member.user_id == user_id,
      other_member.user_id != user_id,
      _direct_chat_member_count_subquery(Chat.id) == 2,
    )
  )
  return db.scalar(statement) or 0


def count_chat_messages(db: Session, chat_id: int) -> int:
  statement = select(func.count()).select_from(Message).where(Message.chat_id == chat_id)
  return db.scalar(statement) or 0


def list_chat_messages(db: Session, chat_id: int, skip: int = 0, limit: int = 30) -> list[Message]:
  statement = (
    select(Message)
    .where(Message.chat_id == chat_id)
    .order_by(Message.created_at.desc(), Message.id.desc())
    .offset(skip)
    .limit(limit)
  )
  return list(db.scalars(statement).all())


def create_chat_message(
  db: Session,
  chat_id: int,
  sender_id: int,
  content: str | None = None,
  media_url: str | None = None,
  media_type: str | None = None,
) -> Message:
  """Tạo tin nhắn mới, hỗ trợ cả text và media."""
  # Kiểm tra phải có ít nhất content hoặc media_url
  if not content and not media_url:
    raise ValueError('Tin nhắn phải có nội dung hoặc đính kèm ảnh/video.')
  
  normalized_content = normalize_message_content(content) if content else None
  message = Message(chat_id=chat_id, sender_id=sender_id, content=normalized_content)
  db.add(message)
  db.flush()  # flush để lấy message.id
  
  # Nếu có media_url thì lưu MessageMedia
  if media_url:
    # Xác định MediaType từ media_type string hoặc đuôi file
    resolved_media_type = MediaType.IMAGE
    if media_type and media_type.startswith('video/'):
      resolved_media_type = MediaType.VIDEO
    elif media_url.lower().endswith(('.mp4', '.webm', '.mov', '.avi', '.mkv')):
      resolved_media_type = MediaType.VIDEO
    
    message_media = MessageMedia(
      message_id=message.id,
      file_url=media_url,
      type=resolved_media_type,
    )
    db.add(message_media)
  
  db.commit()
  db.refresh(message)
  return message

def has_unread_messages(db: Session, user_id: int) -> bool:
  read_status_exists = (
    select(MessageStatus.message_id)
    .where(
      MessageStatus.message_id == Message.id,
      MessageStatus.user_id == user_id,
      MessageStatus.status == MessageStatusType.READ,
    )
    .exists()
  )
  statement = (
    select(Message.id)
    .join(ChatMember, ChatMember.chat_id == Message.chat_id)
    .where(
      ChatMember.user_id == user_id,
      Message.sender_id != user_id,
      ~read_status_exists,
    )
    .exists()
  )
  return db.scalar(select(statement)) or False


def count_unread_chat_messages(db: Session, chat_id: int, user_id: int) -> int:
  read_status_exists = (
    select(MessageStatus.message_id)
    .where(
      MessageStatus.message_id == Message.id,
      MessageStatus.user_id == user_id,
      MessageStatus.status == MessageStatusType.READ,
    )
    .exists()
  )
  statement = (
    select(func.count())
    .select_from(Message)
    .where(
      Message.chat_id == chat_id,
      Message.sender_id != user_id,
      ~read_status_exists,
    )
  )
  return db.scalar(statement) or 0


def mark_chat_messages_read(db: Session, chat_id: int, user_id: int) -> int:
  message_ids = list(db.scalars(
    select(Message.id).where(
      Message.chat_id == chat_id,
      Message.sender_id != user_id,
    )
  ).all())

  if not message_ids:
    return 0

  existing_statuses = {
    status.message_id: status
    for status in db.scalars(
      select(MessageStatus).where(
        MessageStatus.user_id == user_id,
        MessageStatus.message_id.in_(message_ids),
      )
    ).all()
  }
  updated_at = datetime.now(timezone.utc)

  for message_id in message_ids:
    existing_status = existing_statuses.get(message_id)
    if existing_status is None:
      db.add(MessageStatus(message_id=message_id, user_id=user_id, status=MessageStatusType.READ, updated_at=updated_at))
    else:
      existing_status.status = MessageStatusType.READ
      existing_status.updated_at = updated_at

  db.commit()
  return count_unread_chat_messages(db, chat_id, user_id)


def get_latest_chat_message(db: Session, chat_id: int) -> Message | None:
  statement = (
    select(Message)
    .where(Message.chat_id == chat_id)
    .order_by(Message.created_at.desc(), Message.id.desc())
  )
  return db.scalars(statement).first()


def list_direct_chats_for_user(db: Session, user_id: int, skip: int = 0, limit: int | None = None) -> list[DirectChatThread]:
  current_member = aliased(ChatMember)
  other_member = aliased(ChatMember)
  statement = (
    select(Chat, User)
    .join(current_member, current_member.chat_id == Chat.id)
    .join(other_member, other_member.chat_id == Chat.id)
    .join(User, User.id == other_member.user_id)
    .where(
      Chat.is_group.is_(False),
      current_member.user_id == user_id,
      other_member.user_id != user_id,
      _direct_chat_member_count_subquery(Chat.id) == 2,
    )
  )

  threads: list[DirectChatThread] = []
  for chat, participant in db.execute(statement).all():
    latest_message = get_latest_chat_message(db, chat.id)
    threads.append(
      DirectChatThread(
        chat=chat,
        participant=participant,
        latest_message=latest_message,
        updated_at=latest_message.created_at if latest_message is not None else chat.created_at,
        unread_count=count_unread_chat_messages(db, chat.id, user_id),
      )
    )

  sorted_threads = sorted(
    threads,
    key=lambda thread: (thread.updated_at, thread.chat.id),
    reverse=True,
  )

  if limit is None:
    return sorted_threads[skip:]
  return sorted_threads[skip:skip + limit]
