from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.follow import Follow


def is_following(db: Session, follower_id: int, following_id: int) -> bool:
  statement = select(Follow).where(
    and_(
      Follow.follower_id == follower_id,
      Follow.following_id == following_id,
    )
  )
  return db.scalar(statement) is not None


def create_follow(db: Session, follower_id: int, following_id: int) -> bool:
  if follower_id == following_id:
    return False

  if is_following(db, follower_id, following_id):
    return True

  db.add(Follow(follower_id=follower_id, following_id=following_id))
  db.commit()
  return True


def delete_follow(db: Session, follower_id: int, following_id: int) -> bool:
  statement = select(Follow).where(
    and_(
      Follow.follower_id == follower_id,
      Follow.following_id == following_id,
    )
  )
  follow = db.scalar(statement)
  if follow is None:
    return False

  db.delete(follow)
  db.commit()
  return True


def count_followers(db: Session, user_id: int) -> int:
  statement = select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
  return int(db.scalar(statement) or 0)


def count_following(db: Session, user_id: int) -> int:
  statement = select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
  return int(db.scalar(statement) or 0)
