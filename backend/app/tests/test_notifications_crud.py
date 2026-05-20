from __future__ import annotations

import asyncio
from importlib import import_module
from typing import Any

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User


def load_notification_module(module_name: str) -> Any:
  try:
    return import_module(module_name)
  except ModuleNotFoundError as error:
    pytest.fail(f'Missing notification module: {module_name} ({error})')


def build_test_session() -> Session:
  engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
  User.__table__.create(bind=engine)
  Notification.__table__.create(bind=engine)
  return Session(bind=engine)


def seed_users(db: Session) -> tuple[User, User, User]:
  receiver = User(email='receiver@example.com', password_hash='hash', first_name='Receiver', last_name='User', gender='female')
  actor = User(email='actor@example.com', password_hash='hash', first_name='Actor', last_name='User', gender='male')
  another = User(email='another@example.com', password_hash='hash', first_name='Another', last_name='User', gender='female')
  db.add_all([receiver, actor, another])
  db.commit()
  db.refresh(receiver)
  db.refresh(actor)
  db.refresh(another)
  return receiver, actor, another


def test_create_social_notification_creates_follow_notification() -> None:
  notification_service = load_notification_module('app.services.notification')

  with build_test_session() as db:
    receiver, actor, _ = seed_users(db)

    created = notification_service.create_social_notification(
      db,
      receiver_id=receiver.id,
      actor_id=actor.id,
      type='follow',
      related_user_id=actor.id,
      emit=False,
    )

    assert created is not None
    assert created.receiver_id == receiver.id
    assert created.actor_id == actor.id
    assert created.type.value == 'follow'
    assert created.related_user_id == actor.id
    assert created.is_read is False


def test_create_social_notification_skips_self_notification() -> None:
  notification_service = load_notification_module('app.services.notification')
  notification_crud = load_notification_module('app.crud.notification')

  with build_test_session() as db:
    receiver, _, _ = seed_users(db)

    created = notification_service.create_social_notification(
      db,
      receiver_id=receiver.id,
      actor_id=receiver.id,
      type='follow',
      related_user_id=receiver.id,
    )

    assert created is None
    assert notification_crud.count_unread_notifications(db, receiver_id=receiver.id) == 0


def test_list_notifications_returns_newest_first_and_can_filter_unread() -> None:
  notification_crud = load_notification_module('app.crud.notification')

  with build_test_session() as db:
    receiver, actor, another = seed_users(db)
    oldest = notification_crud.create_notification(
      db,
      receiver_id=receiver.id,
      actor_id=actor.id,
      type='follow',
      related_user_id=actor.id,
    )
    newest = notification_crud.create_notification(
      db,
      receiver_id=receiver.id,
      actor_id=another.id,
      type='follow',
      related_user_id=another.id,
    )
    notification_crud.mark_notification_read(db, receiver_id=receiver.id, notification_id=oldest.id)

    listed = notification_crud.list_notifications(db, receiver_id=receiver.id)
    unread_only = notification_crud.list_notifications(db, receiver_id=receiver.id, unread_only=True)

    assert [item.id for item in listed] == [newest.id, oldest.id]
    assert [item.id for item in unread_only] == [newest.id]
    assert notification_crud.count_unread_notifications(db, receiver_id=receiver.id) == 1


def test_mark_notification_read_and_mark_all_notifications_read_update_state() -> None:
  notification_crud = load_notification_module('app.crud.notification')

  with build_test_session() as db:
    receiver, actor, another = seed_users(db)
    first = notification_crud.create_notification(
      db,
      receiver_id=receiver.id,
      actor_id=actor.id,
      type='follow',
      related_user_id=actor.id,
    )
    second = notification_crud.create_notification(
      db,
      receiver_id=receiver.id,
      actor_id=another.id,
      type='follow',
      related_user_id=another.id,
    )

    marked = notification_crud.mark_notification_read(db, receiver_id=receiver.id, notification_id=first.id)
    assert marked is not None
    assert marked.is_read is True
    assert notification_crud.count_unread_notifications(db, receiver_id=receiver.id) == 1

    updated_count = notification_crud.mark_all_notifications_read(db, receiver_id=receiver.id)
    refreshed_second = db.get(Notification, second.id)

    assert updated_count == 1
    assert refreshed_second is not None
    assert refreshed_second.is_read is True
    assert notification_crud.count_unread_notifications(db, receiver_id=receiver.id) == 0


def test_emit_notification_created_uses_receiver_room_and_expected_payload() -> None:
  notification_service = load_notification_module('app.services.notification')

  with build_test_session() as db:
    receiver, actor, _ = seed_users(db)
    created = notification_service.create_social_notification(
      db,
      receiver_id=receiver.id,
      actor_id=actor.id,
      type='follow',
      related_user_id=actor.id,
      emit=False,
    )
    assert created is not None

    captured: dict[str, Any] = {}

    async def fake_emit(event: str, payload: dict[str, Any], room: str) -> None:
      captured['event'] = event
      captured['payload'] = payload
      captured['room'] = room

    notification_service.socket_server.sio.emit = fake_emit
    asyncio.run(notification_service.emit_notification_created(created))

    assert captured['event'] == 'notification-created'
    assert captured['room'] == notification_service.socket_server.get_user_room_name(receiver.id)
    assert set(captured['payload']) >= {'id', 'receiver_id', 'actor_id', 'type', 'is_read', 'created_at'}
    assert captured['payload']['id'] == created.id
    assert captured['payload']['receiver_id'] == receiver.id
    assert captured['payload']['actor_id'] == actor.id
    assert captured['payload']['type'] == 'follow'
    assert captured['payload']['is_read'] is False


def test_create_social_notification_returns_created_notification_when_emit_fails() -> None:
  notification_service = load_notification_module('app.services.notification')
  notification_crud = load_notification_module('app.crud.notification')

  with build_test_session() as db:
    receiver, actor, _ = seed_users(db)

    def raising_run(*args: Any, **kwargs: Any) -> None:
      raise RuntimeError('emit failed')

    notification_service.from_thread.run = raising_run

    created = notification_service.create_social_notification(
      db,
      receiver_id=receiver.id,
      actor_id=actor.id,
      type='follow',
      related_user_id=actor.id,
    )

    assert created is not None
    assert created.receiver_id == receiver.id
    assert created.actor_id == actor.id
    assert notification_crud.count_unread_notifications(db, receiver_id=receiver.id) == 1
