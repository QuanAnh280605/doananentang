from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.group import Chat
from app.models.group_member import ChatMember
from app.models.message import Message
from app.models.user import User


@dataclass(slots=True)
class DirectChatThread:
  chat: Chat
  participant: User
  latest_message: Message | None
  updated_at: datetime


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


def list_chat_messages(db: Session, chat_id: int) -> list[Message]:
  statement = (
    select(Message)
    .where(Message.chat_id == chat_id)
    .order_by(Message.created_at.asc(), Message.id.asc())
  )
  return list(db.scalars(statement).all())


def create_chat_message(db: Session, chat_id: int, sender_id: int, content: str) -> Message:
  message = Message(chat_id=chat_id, sender_id=sender_id, content=normalize_message_content(content))
  db.add(message)
  db.commit()
  db.refresh(message)
  return message


def get_latest_chat_message(db: Session, chat_id: int) -> Message | None:
  statement = (
    select(Message)
    .where(Message.chat_id == chat_id)
    .order_by(Message.created_at.desc(), Message.id.desc())
  )
  return db.scalars(statement).first()


def list_direct_chats_for_user(db: Session, user_id: int) -> list[DirectChatThread]:
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
      )
    )

  return sorted(
    threads,
    key=lambda thread: (thread.updated_at, thread.chat.id),
    reverse=True,
  )
