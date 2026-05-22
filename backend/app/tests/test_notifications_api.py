from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.database import get_db
from app.crud.notification import create_notification
from app.models.notification import Notification
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
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


def seed_notification(
  db: Session,
  *,
  receiver: User,
  actor: User,
  related_user_id: int,
  created_at: datetime,
  is_read: bool = False,
) -> Notification:
  notification = create_notification(
    db,
    receiver_id=receiver.id,
    actor_id=actor.id,
    type='follow',
    related_user_id=related_user_id,
  )
  notification.created_at = created_at
  notification.is_read = is_read
  db.commit()
  db.refresh(notification)
  return notification


def test_get_notifications_returns_current_user_items_and_unread_count() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    first_actor = seed_user(db, email='actor1@example.com', first_name='Actor1')
    second_actor = seed_user(db, email='actor2@example.com', first_name='Actor2')
    other_user = seed_user(db, email='other@example.com', first_name='Other')
    start_time = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)

    older = seed_notification(
      db,
      receiver=current_user,
      actor=first_actor,
      related_user_id=first_actor.id,
      created_at=start_time,
      is_read=True,
    )
    newer = seed_notification(
      db,
      receiver=current_user,
      actor=second_actor,
      related_user_id=second_actor.id,
      created_at=start_time + timedelta(minutes=1),
    )
    seed_notification(
      db,
      receiver=other_user,
      actor=first_actor,
      related_user_id=first_actor.id,
      created_at=start_time + timedelta(minutes=2),
    )
    client = build_client(db, current_user)

    response = client.get('/api/notifications')

    assert response.status_code == 200
    payload = response.json()
    assert payload['unread_count'] == 1
    assert [item['id'] for item in payload['items']] == [newer.id, older.id]
    assert payload['items'][0]['receiver_id'] == current_user.id
    assert payload['items'][0]['actor_name'] == second_actor.full_name
    assert payload['items'][0]['is_read'] is False
    assert payload['items'][1]['is_read'] is True


def test_get_notifications_can_filter_unread_only() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    first_actor = seed_user(db, email='actor1@example.com', first_name='Actor1')
    second_actor = seed_user(db, email='actor2@example.com', first_name='Actor2')
    start_time = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)

    read_notification = seed_notification(
      db,
      receiver=current_user,
      actor=first_actor,
      related_user_id=first_actor.id,
      created_at=start_time,
      is_read=True,
    )
    unread_notification = seed_notification(
      db,
      receiver=current_user,
      actor=second_actor,
      related_user_id=second_actor.id,
      created_at=start_time + timedelta(minutes=1),
    )
    client = build_client(db, current_user)

    response = client.get('/api/notifications?unread_only=true')

    assert response.status_code == 200
    payload = response.json()
    assert payload['unread_count'] == 1
    assert [item['id'] for item in payload['items']] == [unread_notification.id]
    assert read_notification.id not in [item['id'] for item in payload['items']]


def test_patch_notification_read_marks_current_user_notification_read() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    notification = seed_notification(
      db,
      receiver=current_user,
      actor=actor,
      related_user_id=actor.id,
      created_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
    )
    client = build_client(db, current_user)

    response = client.patch(f'/api/notifications/{notification.id}/read')

    assert response.status_code == 200
    payload = response.json()
    assert payload['id'] == notification.id
    assert payload['is_read'] is True
    db.refresh(notification)
    assert notification.is_read is True


def test_patch_notification_read_returns_not_found_for_other_users_notification() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    other_user = seed_user(db, email='other@example.com', first_name='Other')
    actor = seed_user(db, email='actor@example.com', first_name='Actor')
    notification = seed_notification(
      db,
      receiver=other_user,
      actor=actor,
      related_user_id=actor.id,
      created_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
    )
    client = build_client(db, current_user)

    response = client.patch(f'/api/notifications/{notification.id}/read')

    assert response.status_code == 404
    assert response.json() == {'detail': 'Notification not found'}
    db.refresh(notification)
    assert notification.is_read is False


def test_patch_notifications_read_all_marks_all_current_user_notifications_read() -> None:
  with build_test_session() as db:
    current_user = seed_user(db, email='current@example.com', first_name='Current')
    first_actor = seed_user(db, email='actor1@example.com', first_name='Actor1')
    second_actor = seed_user(db, email='actor2@example.com', first_name='Actor2')
    other_user = seed_user(db, email='other@example.com', first_name='Other')
    first = seed_notification(
      db,
      receiver=current_user,
      actor=first_actor,
      related_user_id=first_actor.id,
      created_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
    )
    second = seed_notification(
      db,
      receiver=current_user,
      actor=second_actor,
      related_user_id=second_actor.id,
      created_at=datetime(2026, 1, 1, 9, 1, tzinfo=timezone.utc),
    )
    untouched = seed_notification(
      db,
      receiver=other_user,
      actor=first_actor,
      related_user_id=first_actor.id,
      created_at=datetime(2026, 1, 1, 9, 2, tzinfo=timezone.utc),
    )
    client = build_client(db, current_user)

    response = client.patch('/api/notifications/read-all')

    assert response.status_code == 200
    payload = response.json()
    assert payload['unread_count'] == 0
    assert [item['id'] for item in payload['items']] == [second.id, first.id]
    assert all(item['is_read'] is True for item in payload['items'])
    db.refresh(first)
    db.refresh(second)
    db.refresh(untouched)
    assert first.is_read is True
    assert second.is_read is True
    assert untouched.is_read is False
