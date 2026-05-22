from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.like import Like
from app.models.user import User
from app.models.db_enums import ReactionType


def like_post(db: Session, post_id: int, user_id: int, reaction_type: ReactionType = ReactionType.LIKE) -> Like:
  """Thích bài viết hoặc cập nhật cảm xúc."""
  existing = (
    db.query(Like)
    .filter(Like.post_id == post_id, Like.user_id == user_id)
    .first()
  )
  if existing:
    if existing.reaction_type != reaction_type:
      existing.reaction_type = reaction_type
      db.commit()
      db.refresh(existing)
    return existing

  db_like = Like(post_id=post_id, user_id=user_id, reaction_type=reaction_type)
  db.add(db_like)
  db.commit()
  db.refresh(db_like)
  return db_like


def unlike_post(db: Session, post_id: int, user_id: int) -> bool:
  """Bỏ thích bài viết."""
  existing = (
    db.query(Like)
    .filter(Like.post_id == post_id, Like.user_id == user_id)
    .first()
  )
  if not existing:
    return False

  db.delete(existing)
  db.commit()
  return True


def get_like_count(db: Session, post_id: int) -> int:
  """Đếm số lượt thích của bài viết."""
  return db.query(func.count()).filter(Like.post_id == post_id).scalar() or 0


def is_liked_by_user(db: Session, post_id: int, user_id: int) -> bool:
  """Kiểm tra user hiện tại đã like bài viết hay chưa."""
  return (
    db.query(Like)
    .filter(Like.post_id == post_id, Like.user_id == user_id)
    .first()
  ) is not None


def get_users_who_liked(db: Session, post_id: int):
  """Lấy danh sách người dùng đã like bài viết kèm cảm xúc."""
  return (
    db.query(User, Like.reaction_type)
    .join(Like, Like.user_id == User.id)
    .filter(Like.post_id == post_id)
    .order_by(Like.created_at.desc())
    .all()
  )
