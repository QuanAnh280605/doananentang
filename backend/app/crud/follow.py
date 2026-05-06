from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.follow import Follow
from app.models.user import User


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


def search_following_users(db: Session, follower_id: int, query: str, limit: int = 20) -> list[User]:
  normalized_query = query.strip().lower()
  if not normalized_query:
    return []

  pattern = f'%{normalized_query}%'
  full_name = func.lower(User.first_name + ' ' + User.last_name)

  statement = (
    select(User)
    .join(Follow, Follow.following_id == User.id)
    .where(
      and_(
        Follow.follower_id == follower_id,
        or_(
          func.lower(User.first_name).like(pattern),
          func.lower(User.last_name).like(pattern),
          full_name.like(pattern),
        ),
      )
    )
    .order_by(User.first_name, User.last_name, User.id)
    .limit(max(1, min(limit, 50)))
  )
  return list(db.scalars(statement).all())
