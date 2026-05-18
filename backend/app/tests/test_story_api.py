from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.api.router import api_router
from app.core.database import get_db
from app.models.story import Story
from app.models.story_view import StoryView
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Story.__table__.create(bind=engine)
  StoryView.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, *, email: str, first_name: str = 'Story') -> User:
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


def build_client(db: Session, current_user: User | None = None) -> TestClient:
  app = FastAPI()
  app.include_router(api_router, prefix='/api')

  def override_get_db():
    yield db

  def override_current_user() -> User:
    if current_user is None:
      raise AssertionError('current user is required for this test')
    return current_user

  def override_current_user_optional() -> User | None:
    return current_user

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_current_user] = override_current_user
  app.dependency_overrides[get_current_user_optional] = override_current_user_optional
  return TestClient(app)


def test_create_and_list_stories() -> None:
  with build_test_session() as db:
    user = seed_user(db, email='author@example.com', first_name='Author')
    client = build_client(db, user)

    create_response = client.post(
      '/api/stories',
      json={
        'file_url': '/static/stories/first.webp',
        'caption': 'Morning coffee',
        'type': 'image',
        'visibility': 'public',
      },
    )

    assert create_response.status_code == 201
    created_story = create_response.json()
    assert created_story['file_url'] == '/static/stories/first.webp'
    assert created_story['caption'] == 'Morning coffee'
    assert created_story['view_count'] == 0
    assert created_story['is_viewed'] is False
    assert created_story['author']['first_name'] == 'Author'

    list_response = client.get('/api/stories')

    assert list_response.status_code == 200
    stories = list_response.json()
    assert [story['id'] for story in stories] == [created_story['id']]


def test_list_stories_excludes_expired_story() -> None:
  with build_test_session() as db:
    user = seed_user(db, email='author@example.com')
    client = build_client(db, user)
    active = Story(
      user_id=user.id,
      file_url='/static/stories/active.webp',
      caption='Active',
      type='image',
      visibility='public',
      expired_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    expired = Story(
      user_id=user.id,
      file_url='/static/stories/expired.webp',
      caption='Expired',
      type='image',
      visibility='public',
      expired_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.add_all([active, expired])
    db.commit()

    response = client.get('/api/stories')

    assert response.status_code == 200
    assert [story['file_url'] for story in response.json()] == ['/static/stories/active.webp']


def test_mark_story_viewed_is_idempotent() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com')
    viewer = seed_user(db, email='viewer@example.com', first_name='Viewer')
    story = Story(
      user_id=author.id,
      file_url='/static/stories/viewed.webp',
      caption='Viewed',
      type='image',
      visibility='public',
      expired_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    client = build_client(db, viewer)

    first_response = client.post(f'/api/stories/{story.id}/views')
    second_response = client.post(f'/api/stories/{story.id}/views')

    assert first_response.status_code == 200
    assert first_response.json()['view_count'] == 1
    assert second_response.status_code == 200
    assert second_response.json()['view_count'] == 1


def test_delete_story_rejects_non_author() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com')
    other = seed_user(db, email='other@example.com', first_name='Other')
    story = Story(
      user_id=author.id,
      file_url='/static/stories/delete.webp',
      caption='Delete',
      type='image',
      visibility='public',
      expired_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    client = build_client(db, other)

    response = client.delete(f'/api/stories/{story.id}')

    assert response.status_code == 403


def test_upload_story_media_rejects_non_image() -> None:
  with build_test_session() as db:
    user = seed_user(db, email='author@example.com')
    client = build_client(db, user)

    response = client.post(
      '/api/stories/upload-media',
      files={'file': ('story.txt', b'not-image', 'text/plain')},
    )

    assert response.status_code == 400


def test_upload_story_media_returns_static_story_url() -> None:
  with build_test_session() as db:
    user = seed_user(db, email='author@example.com')
    client = build_client(db, user)

    response = client.post(
      '/api/stories/upload-media',
      files={'file': ('story.jpg', b'fake-image', 'image/jpeg')},
    )

    assert response.status_code == 201
    body = response.json()
    assert body['file_url'].startswith('/static/stories/')
    assert body['file_url'].endswith('.jpg')
