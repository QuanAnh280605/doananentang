from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

import pytest
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
  User.__table__.create(bind=engine)
  Post.__table__.create(bind=engine)
  PostMedia.__table__.create(bind=engine)
  Comment.__table__.create(bind=engine)
  Like.__table__.create(bind=engine)
  CommentLike.__table__.create(bind=engine)
  Follow.__table__.create(bind=engine)
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


def seed_post(db: Session, *, author_id: int, content: str = 'Post content') -> Post:
  post = Post(author_id=author_id, content=content)
  db.add(post)
  db.commit()
  db.refresh(post)
  return post


def seed_comment(
  db: Session,
  *,
  post_id: int,
  author_id: int,
  content: str = 'Comment content',
  parent_comment_id: int | None = None,
) -> Comment:
  comment = Comment(
    post_id=post_id,
    author_id=author_id,
    content=content,
    parent_comment_id=parent_comment_id,
  )
  db.add(comment)
  db.commit()
  db.refresh(comment)
  return comment


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


def install_emit_capture(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
  from app.services import notification as notification_service

  captured: list[dict[str, Any]] = []

  async def fake_emit(event: str, payload: dict[str, Any], room: str) -> None:
    captured.append({'event': event, 'payload': payload, 'room': room})

  def run_async(func: Callable[..., Any], *args: Any) -> None:
    asyncio.run(func(*args))

  monkeypatch.setattr(notification_service.socket_server.sio, 'emit', fake_emit)
  monkeypatch.setattr(notification_service.from_thread, 'run', run_async)
  return captured


def test_like_post_creates_notification_and_duplicate_like_does_not_emit_twice(monkeypatch: pytest.MonkeyPatch) -> None:
  from app.realtime.socket_server import get_user_room_name

  with build_test_session() as db:
    owner = seed_user(db, email='owner@example.com', first_name='Owner')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    post = seed_post(db, author_id=owner.id)
    client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    first_response = client.post(f'/api/posts/{post.id}/like')
    second_response = client.post(f'/api/posts/{post.id}/like')

    assert first_response.status_code == 200
    assert first_response.json() == {'post_id': post.id, 'liked': True, 'like_count': 1}
    assert second_response.status_code == 200
    assert second_response.json() == {'post_id': post.id, 'liked': True, 'like_count': 1}

    notifications = list_notifications(db)
    assert len(notifications) == 1
    assert notifications[0].receiver_id == owner.id
    assert notifications[0].actor_id == actor.id
    assert notifications[0].type.value == 'like'
    assert notifications[0].post_id == post.id
    assert len(captured) == 1
    assert captured[0]['event'] == 'notification-created'
    assert captured[0]['room'] == get_user_room_name(owner.id)
    assert set(captured[0]['payload']) >= {'id', 'receiver_id', 'actor_id', 'type', 'is_read', 'created_at'}
    assert captured[0]['payload']['receiver_id'] == owner.id
    assert captured[0]['payload']['actor_id'] == actor.id
    assert captured[0]['payload']['actor_name'] == actor.full_name
    assert captured[0]['payload']['type'] == 'like'
    assert captured[0]['payload']['post_id'] == post.id


def test_like_own_post_does_not_create_notification_or_emit(monkeypatch: pytest.MonkeyPatch) -> None:
  with build_test_session() as db:
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    post = seed_post(db, author_id=actor.id)
    client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    response = client.post(f'/api/posts/{post.id}/like')

    assert response.status_code == 200
    assert response.json() == {'post_id': post.id, 'liked': True, 'like_count': 1}
    assert list_notifications(db) == []
    assert captured == []


def test_create_comment_creates_notification_for_post_owner_and_reply_targets_parent_author(monkeypatch: pytest.MonkeyPatch) -> None:
  from app.realtime.socket_server import get_user_room_name

  with build_test_session() as db:
    post_owner = seed_user(db, email='post-owner@example.com', first_name='PostOwner')
    parent_author = seed_user(db, email='parent@example.com', first_name='Parent')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    post = seed_post(db, author_id=post_owner.id)
    parent_comment = seed_comment(db, post_id=post.id, author_id=parent_author.id)
    client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    comment_response = client.post(f'/api/comments/post/{post.id}', json={'content': 'New comment'})
    reply_response = client.post(
      f'/api/comments/post/{post.id}',
      json={'content': 'Reply comment', 'parent_comment_id': parent_comment.id},
    )

    assert comment_response.status_code == 201
    assert reply_response.status_code == 201

    notifications = list_notifications(db)
    assert len(notifications) == 2

    post_notification = notifications[0]
    reply_notification = notifications[1]
    assert post_notification.receiver_id == post_owner.id
    assert post_notification.actor_id == actor.id
    assert post_notification.type.value == 'comment'
    assert post_notification.comment_id == comment_response.json()['id']

    assert reply_notification.receiver_id == parent_author.id
    assert reply_notification.actor_id == actor.id
    assert reply_notification.type.value == 'comment'
    assert reply_notification.comment_id == reply_response.json()['id']

    assert len(captured) == 2
    assert captured[0]['room'] == get_user_room_name(post_owner.id)
    assert captured[0]['payload']['comment_id'] == comment_response.json()['id']
    assert captured[0]['payload']['actor_name'] == actor.full_name
    assert captured[1]['room'] == get_user_room_name(parent_author.id)
    assert captured[1]['payload']['comment_id'] == reply_response.json()['id']
    assert captured[1]['payload']['target_post_id'] == post.id


def test_reply_to_own_comment_does_not_create_notification_or_emit(monkeypatch: pytest.MonkeyPatch) -> None:
  with build_test_session() as db:
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    post = seed_post(db, author_id=seed_user(db, email='owner@example.com', first_name='Owner').id)
    own_comment = seed_comment(db, post_id=post.id, author_id=actor.id)
    client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    response = client.post(
      f'/api/comments/post/{post.id}',
      json={'content': 'Self reply', 'parent_comment_id': own_comment.id},
    )

    assert response.status_code == 201
    assert list_notifications(db) == []
    assert captured == []


def test_like_comment_creates_notification_and_like_own_comment_skips_emit(monkeypatch: pytest.MonkeyPatch) -> None:
  from app.realtime.socket_server import get_user_room_name

  with build_test_session() as db:
    owner = seed_user(db, email='owner@example.com', first_name='Owner')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    post = seed_post(db, author_id=owner.id)
    comment = seed_comment(db, post_id=post.id, author_id=owner.id)
    actor_client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    first_response = actor_client.post(f'/api/comments/{comment.id}/like')
    second_response = actor_client.post(f'/api/comments/{comment.id}/like')

    assert first_response.status_code == 200
    assert first_response.json() == {'status': 'liked', 'like_count': 1, 'is_liked': True}
    assert second_response.status_code == 200
    assert second_response.json() == {'status': 'liked', 'like_count': 1, 'is_liked': True}

    notifications = list_notifications(db)
    assert len(notifications) == 1
    assert notifications[0].receiver_id == owner.id
    assert notifications[0].actor_id == actor.id
    assert notifications[0].type.value == 'like'
    assert notifications[0].comment_id == comment.id
    assert len(captured) == 1
    assert captured[0]['event'] == 'notification-created'
    assert captured[0]['room'] == get_user_room_name(owner.id)
    assert captured[0]['payload']['comment_id'] == comment.id
    assert captured[0]['payload']['actor_name'] == actor.full_name
    assert captured[0]['payload']['target_post_id'] == post.id

    monkeypatch.undo()
    own_client = build_client(db, owner)
    captured = install_emit_capture(monkeypatch)

    own_response = own_client.post(f'/api/comments/{comment.id}/like')

    assert own_response.status_code == 200
    assert own_response.json() == {'status': 'liked', 'like_count': 2, 'is_liked': True}
    assert len(list_notifications(db)) == 1
    assert captured == []


def test_follow_creates_notification_and_duplicate_follow_does_not_emit_twice(monkeypatch: pytest.MonkeyPatch) -> None:
  from app.realtime.socket_server import get_user_room_name

  with build_test_session() as db:
    target = seed_user(db, email='target@example.com', first_name='Target')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    client = build_client(db, actor)
    captured = install_emit_capture(monkeypatch)

    first_response = client.post(f'/api/users/{target.id}/follow')
    second_response = client.post(f'/api/users/{target.id}/follow')

    assert first_response.status_code == 200
    assert first_response.json() == {
      'user_id': target.id,
      'is_following': True,
      'followers_count': 1,
      'following_count': 0,
    }
    assert second_response.status_code == 200
    assert second_response.json() == {
      'user_id': target.id,
      'is_following': True,
      'followers_count': 1,
      'following_count': 0,
    }

    notifications = list_notifications(db)
    assert len(notifications) == 1
    assert notifications[0].receiver_id == target.id
    assert notifications[0].actor_id == actor.id
    assert notifications[0].type.value == 'follow'
    assert notifications[0].related_user_id == actor.id
    assert len(captured) == 1
    assert captured[0]['event'] == 'notification-created'
    assert captured[0]['room'] == get_user_room_name(target.id)
    assert captured[0]['payload']['related_user_id'] == actor.id


@pytest.mark.parametrize(
  ('seed', 'path', 'payload', 'expected_status', 'expected_notifications'),
  [
    ('post_like', '/api/posts/{id}/like', None, 200, 1),
    ('comment_create', '/api/comments/post/{id}', {'content': 'Emit failure comment'}, 201, 1),
    ('follow', '/api/users/{id}/follow', None, 200, 1),
  ],
)
def test_emit_failure_does_not_fail_primary_action(
  monkeypatch: pytest.MonkeyPatch,
  seed: str,
  path: str,
  payload: dict[str, Any] | None,
  expected_status: int,
  expected_notifications: int,
) -> None:
  from app.services import notification as notification_service

  with build_test_session() as db:
    receiver = seed_user(db, email='receiver@example.com', first_name='Receiver')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')

    if seed == 'post_like':
      resource_id = seed_post(db, author_id=receiver.id).id
    elif seed == 'comment_create':
      resource_id = seed_post(db, author_id=receiver.id).id
    else:
      resource_id = receiver.id

    def raising_run(*args: Any, **kwargs: Any) -> None:
      raise RuntimeError('emit failed')

    monkeypatch.setattr(notification_service.from_thread, 'run', raising_run)
    client = build_client(db, actor)

    response = client.post(path.format(id=resource_id), json=payload)

    assert response.status_code == expected_status
    assert len(list_notifications(db)) == expected_notifications
