from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.database import get_db
from app.models.group import Chat
from app.models.group_member import ChatMember
from app.models.message import Message
from app.models.message_read import MessageStatus
from app.crud.chat import get_chat_member_user_ids
from app.models.user import User
from app.realtime.socket_server import PresenceRegistry, get_user_room_name


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Chat.__table__.create(bind=engine)
  ChatMember.__table__.create(bind=engine)
  Message.__table__.create(bind=engine)
  MessageStatus.__table__.create(bind=engine)
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


def test_list_chat_messages_returns_newest_first_with_pagination() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    participant = seed_user(db, email='participant@example.com', first_name='Participant')
    chat = Chat(is_group=False)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    db.add_all([
      ChatMember(chat_id=chat.id, user_id=current_user.id),
      ChatMember(chat_id=chat.id, user_id=participant.id),
    ])
    start_time = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)
    messages = [
      Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=f'Message {index}',
        created_at=start_time + timedelta(minutes=index),
      )
      for index in range(5)
    ]
    db.add_all(messages)
    db.commit()
    client = build_client(db, current_user)

    first_page_response = client.get(f'/api/chats/{chat.id}/messages?page=1&page_size=2')
    second_page_response = client.get(f'/api/chats/{chat.id}/messages?page=2&page_size=2')

    assert first_page_response.status_code == 200
    first_page = first_page_response.json()
    assert [item['content'] for item in first_page['items']] == ['Message 4', 'Message 3']
    assert first_page['total'] == 5
    assert first_page['page'] == 1
    assert first_page['page_size'] == 2
    assert first_page['total_pages'] == 3

    assert second_page_response.status_code == 200
    second_page = second_page_response.json()
    assert [item['content'] for item in second_page['items']] == ['Message 2', 'Message 1']


def test_get_chat_member_user_ids_returns_all_members() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    participant = seed_user(db, email='participant@example.com', first_name='Participant')
    outside_user = seed_user(db, email='outside@example.com', first_name='Outside')
    chat = Chat(is_group=False)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    db.add_all([
      ChatMember(chat_id=chat.id, user_id=current_user.id),
      ChatMember(chat_id=chat.id, user_id=participant.id),
    ])
    db.commit()

    member_ids = get_chat_member_user_ids(db, chat.id)

    assert member_ids == [current_user.id, participant.id]
    assert outside_user.id not in member_ids


def test_list_chats_returns_unread_count_for_messages_from_participant() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    participant = seed_user(db, email='participant@example.com', first_name='Participant')
    chat = Chat(is_group=False)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    db.add_all([
      ChatMember(chat_id=chat.id, user_id=current_user.id),
      ChatMember(chat_id=chat.id, user_id=participant.id),
    ])
    db.commit()
    db.add_all([
      Message(chat_id=chat.id, sender_id=participant.id, content='Unread one'),
      Message(chat_id=chat.id, sender_id=participant.id, content='Unread two'),
      Message(chat_id=chat.id, sender_id=current_user.id, content='Own message'),
    ])
    db.commit()
    client = build_client(db, current_user)

    response = client.get('/api/chats')

    assert response.status_code == 200
    threads = response.json()['items']
    assert threads[0]['chat_id'] == chat.id
    assert threads[0]['unread_count'] == 2


def test_list_chats_returns_paginated_threads_ordered_by_latest_message() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    start_time = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)
    chats: list[Chat] = []

    for index in range(3):
      participant = seed_user(db, email=f'participant-{index}@example.com', first_name=f'Participant{index}')
      chat = Chat(is_group=False)
      db.add(chat)
      db.commit()
      db.refresh(chat)
      db.add_all([
        ChatMember(chat_id=chat.id, user_id=current_user.id),
        ChatMember(chat_id=chat.id, user_id=participant.id),
      ])
      db.add(Message(
        chat_id=chat.id,
        sender_id=participant.id,
        content=f'Message {index}',
        created_at=start_time + timedelta(minutes=index),
      ))
      chats.append(chat)

    db.commit()
    client = build_client(db, current_user)

    first_page_response = client.get('/api/chats?page=1&page_size=2')
    second_page_response = client.get('/api/chats?page=2&page_size=2')

    assert first_page_response.status_code == 200
    first_page = first_page_response.json()
    assert [item['chat_id'] for item in first_page['items']] == [chats[2].id, chats[1].id]
    assert first_page['total'] == 3
    assert first_page['page'] == 1
    assert first_page['page_size'] == 2
    assert first_page['total_pages'] == 2

    assert second_page_response.status_code == 200
    second_page = second_page_response.json()
    assert [item['chat_id'] for item in second_page['items']] == [chats[0].id]


def test_mark_chat_read_clears_unread_count_for_current_user() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    participant = seed_user(db, email='participant@example.com', first_name='Participant')
    chat = Chat(is_group=False)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    db.add_all([
      ChatMember(chat_id=chat.id, user_id=current_user.id),
      ChatMember(chat_id=chat.id, user_id=participant.id),
    ])
    db.commit()
    db.add_all([
      Message(chat_id=chat.id, sender_id=participant.id, content='Unread one'),
      Message(chat_id=chat.id, sender_id=participant.id, content='Unread two'),
    ])
    db.commit()
    client = build_client(db, current_user)

    response = client.post(f'/api/chats/{chat.id}/read')
    list_response = client.get('/api/chats')

    assert response.status_code == 200
    assert response.json() == {'chat_id': chat.id, 'unread_count': 0}
    assert list_response.status_code == 200
    assert list_response.json()['items'][0]['unread_count'] == 0


def test_presence_registry_tracks_online_state_across_multiple_sockets() -> None:
  registry = PresenceRegistry()

  assert registry.connect('socket-1', 10) is True
  assert registry.connect('socket-2', 10) is False
  assert registry.is_online(10) is True
  assert registry.get_online_user_ids() == [10]
  assert registry.disconnect('socket-1') == (10, False)
  assert registry.is_online(10) is True
  assert registry.disconnect('socket-2') == (10, True)
  assert registry.is_online(10) is False
  assert registry.disconnect('missing') == (None, False)


def test_get_user_room_name_uses_stable_user_namespace() -> None:
  assert get_user_room_name(42) == 'user:42'
