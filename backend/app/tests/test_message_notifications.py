from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.database import get_db
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.like import CommentLike, Like
from app.models.message import Message
from app.models.message_read import MessageRead as MessageReadModel
from app.models.notification import Notification
from app.models.post import Post
from app.models.post_media import PostMedia
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  from app.models.group import Group
  from app.models.group_member import GroupMember
  Group.__table__.create(bind=engine)
  GroupMember.__table__.create(bind=engine)
  User.__table__.create(bind=engine)
  Post.__table__.create(bind=engine)
  PostMedia.__table__.create(bind=engine)
  Comment.__table__.create(bind=engine)
  Like.__table__.create(bind=engine)
  CommentLike.__table__.create(bind=engine)
  Follow.__table__.create(bind=engine)
  Message.__table__.create(bind=engine)
  MessageReadModel.__table__.create(bind=engine)
  Notification.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, *, email: str, first_name: str) -> User:
  user = User(
    email=email,
    password_hash='hash',
    first_name=first_name,
    last_name='User',
    gender='female',
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def build_client(db: Session, current_user: User) -> TestClient:
  app = FastAPI()
  app.include_router(api_router, prefix='/api')

  def override_get_db():
    yield db

  def override_current_user() -> User:
    return current_user

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_current_user] = override_current_user
  return TestClient(app)


def list_notifications(db: Session) -> list[Notification]:
  return list(db.scalars(select(Notification).order_by(Notification.id.asc())).all())


def test_send_message_creates_notification_for_other_member(monkeypatch) -> None:
  with build_test_session() as db:
    sender = seed_user(db, email='sender@example.com', first_name='Sender')
    receiver = seed_user(db, email='receiver@example.com', first_name='Receiver')
    sender_client = build_client(db, sender)

    # Tạo direct chat
    chat_response = sender_client.post('/api/chats/direct', json={'target_user_id': receiver.id})
    assert chat_response.status_code == 200
    chat_id = chat_response.json()['chat_id']

    # Patch emit để không cần socket thật
    from app.api import chats as chats_module
    monkeypatch.setattr(chats_module.from_thread, 'run', lambda *a, **kw: None)

    # Gửi tin nhắn
    msg_response = sender_client.post(f'/api/chats/{chat_id}/messages', json={'content': 'Xin chào!'})
    assert msg_response.status_code == 200
    msg_id = msg_response.json()['id']

    # Kiểm tra notification
    notifications = list_notifications(db)
    assert len(notifications) == 1
    notif = notifications[0]
    assert notif.receiver_id == receiver.id
    assert notif.actor_id == sender.id
    assert notif.type.value == 'message'
    assert notif.message_id == msg_id
    assert notif.is_read is False


def test_send_message_does_not_create_notification_for_sender(monkeypatch) -> None:
  with build_test_session() as db:
    sender = seed_user(db, email='sender@example.com', first_name='Sender')
    receiver = seed_user(db, email='receiver@example.com', first_name='Receiver')
    sender_client = build_client(db, sender)

    chat_response = sender_client.post('/api/chats/direct', json={'target_user_id': receiver.id})
    assert chat_response.status_code == 200
    chat_id = chat_response.json()['chat_id']

    from app.api import chats as chats_module
    monkeypatch.setattr(chats_module.from_thread, 'run', lambda *a, **kw: None)

    sender_client.post(f'/api/chats/{chat_id}/messages', json={'content': 'Hello!'})

    notifications = list_notifications(db)
    sender_notification_ids = [n.receiver_id for n in notifications]
    assert sender.id not in sender_notification_ids


def test_send_multiple_messages_creates_notification_per_message(monkeypatch) -> None:
  with build_test_session() as db:
    sender = seed_user(db, email='sender@example.com', first_name='Sender')
    receiver = seed_user(db, email='receiver@example.com', first_name='Receiver')
    sender_client = build_client(db, sender)

    chat_response = sender_client.post('/api/chats/direct', json={'target_user_id': receiver.id})
    assert chat_response.status_code == 200
    chat_id = chat_response.json()['chat_id']

    from app.api import chats as chats_module
    monkeypatch.setattr(chats_module.from_thread, 'run', lambda *a, **kw: None)

    sender_client.post(f'/api/chats/{chat_id}/messages', json={'content': 'Tin nhắn 1'})
    sender_client.post(f'/api/chats/{chat_id}/messages', json={'content': 'Tin nhắn 2'})

    notifications = list_notifications(db)
    assert len(notifications) == 2
    assert all(n.receiver_id == receiver.id for n in notifications)
    assert all(n.type.value == 'message' for n in notifications)
    assert notifications[0].message_id != notifications[1].message_id
