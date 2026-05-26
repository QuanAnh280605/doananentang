from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.crud.story import create_story, get_active_stories, mark_story_viewed
from app.models.story import Story
from app.models.story_view import StoryView
from app.models.user import User
from app.schemas.story import StoryCreate


def build_test_session() -> Session:
  engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
  User.__table__.create(bind=engine)
  Story.__table__.create(bind=engine)
  StoryView.__table__.create(bind=engine)
  return Session(bind=engine)


def seed_user(db: Session, *, email: str = 'story@example.com') -> User:
  user = User(
    email=email,
    password_hash='hash',
    first_name='Story',
    last_name='User',
    gender='female',
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def as_utc(value: datetime) -> datetime:
  if value.tzinfo is None:
    return value.replace(tzinfo=timezone.utc)
  return value


def test_create_story_sets_caption_and_24_hour_expiration() -> None:
  with build_test_session() as db:
    user = seed_user(db)

    story = create_story(
      db,
      StoryCreate(file_url='/static/stories/first.webp', caption='Morning coffee'),
      user.id,
    )

    assert story.user_id == user.id
    assert story.file_url == '/static/stories/first.webp'
    assert story.caption == 'Morning coffee'
    expired_at = as_utc(story.expired_at)
    assert expired_at > datetime.now(timezone.utc) + timedelta(hours=23)
    assert expired_at <= datetime.now(timezone.utc) + timedelta(hours=24, minutes=1)


def test_get_active_stories_excludes_expired_and_adds_view_state() -> None:
  with build_test_session() as db:
    user = seed_user(db)
    viewer = seed_user(db, email='viewer@example.com')
    active_story = create_story(
      db,
      StoryCreate(file_url='/static/stories/active.webp', caption='Active'),
      user.id,
    )
    expired_story = create_story(
      db,
      StoryCreate(file_url='/static/stories/expired.webp', caption='Expired'),
      user.id,
    )
    expired_story.expired_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.add(expired_story)
    db.commit()

    assert mark_story_viewed(db, active_story.id, viewer.id) is True

    stories = get_active_stories(db, current_user_id=viewer.id)

    assert [story.id for story in stories] == [active_story.id]
    assert stories[0].view_count == 1
    assert stories[0].is_viewed is True
    assert stories[0].author.full_name == 'Story User'


def test_mark_story_viewed_is_idempotent() -> None:
  with build_test_session() as db:
    user = seed_user(db)
    story = create_story(
      db,
      StoryCreate(file_url='/static/stories/viewed.webp'),
      user.id,
    )

    assert mark_story_viewed(db, story.id, user.id) is True
    assert mark_story_viewed(db, story.id, user.id) is False

    stories = get_active_stories(db, current_user_id=user.id)
    assert stories[0].view_count == 1
