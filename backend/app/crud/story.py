from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.story import Story
from app.models.story_view import StoryView
from app.schemas.story import StoryCreate


STORY_TTL_HOURS = 24


def create_story(db: Session, story_in: StoryCreate, user_id: int) -> Story:
  db_story = Story(
    user_id=user_id,
    file_url=story_in.file_url,
    caption=story_in.caption,
    type=story_in.type,
    visibility=story_in.visibility,
    expired_at=datetime.now(timezone.utc) + timedelta(hours=STORY_TTL_HOURS),
  )
  db.add(db_story)
  db.commit()
  db.refresh(db_story)
  return db_story


def attach_story_stats(db: Session, story: Story, current_user_id: int | None = None) -> Story:
  story.view_count = db.query(func.count(StoryView.user_id)).filter(StoryView.story_id == story.id).scalar() or 0
  story.is_viewed = False

  if current_user_id is not None:
    story.is_viewed = db.query(StoryView).filter(
      StoryView.story_id == story.id,
      StoryView.user_id == current_user_id,
    ).first() is not None

  return story


def get_story(db: Session, story_id: int, current_user_id: int | None = None) -> Story | None:
  story = (
    db.query(Story)
    .options(joinedload(Story.author))
    .filter(Story.id == story_id)
    .first()
  )
  if story:
    attach_story_stats(db, story, current_user_id)
  return story


def get_active_stories(db: Session, current_user_id: int | None = None) -> list[Story]:
  stories = (
    db.query(Story)
    .options(joinedload(Story.author))
    .filter(Story.expired_at > datetime.now(timezone.utc))
    .order_by(Story.created_at.desc())
    .all()
  )

  for story in stories:
    attach_story_stats(db, story, current_user_id)

  return stories


def mark_story_viewed(db: Session, story_id: int, user_id: int) -> bool:
  existing_view = db.query(StoryView).filter(
    StoryView.story_id == story_id,
    StoryView.user_id == user_id,
  ).first()
  if existing_view:
    return False

  db.add(StoryView(story_id=story_id, user_id=user_id))
  db.commit()
  return True


def delete_story(db: Session, story: Story) -> None:
  db.delete(story)
  db.commit()
