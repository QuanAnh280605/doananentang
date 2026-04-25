from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.like import CommentLike


def like_comment(db: Session, comment_id: int, user_id: int) -> bool:
  """Thích bình luận (idempotent)"""
  existing = db.query(CommentLike).filter(
    CommentLike.comment_id == comment_id,
    CommentLike.user_id == user_id
  ).first()
  
  if existing:
    return True
    
  db_like = CommentLike(comment_id=comment_id, user_id=user_id)
  db.add(db_like)
  db.commit()
  return True


def unlike_comment(db: Session, comment_id: int, user_id: int) -> bool:
  """Bỏ thích bình luận"""
  db.query(CommentLike).filter(
    CommentLike.comment_id == comment_id,
    CommentLike.user_id == user_id
  ).delete()
  db.commit()
  return True


def get_comment_like_count(db: Session, comment_id: int) -> int:
  """Đếm số lượt thích của bình luận"""
  return db.query(func.count(CommentLike.user_id)).filter(
    CommentLike.comment_id == comment_id
  ).scalar() or 0


def is_comment_liked_by_user(db: Session, comment_id: int, user_id: int) -> bool:
  """Kiểm tra người dùng đã thích bình luận chưa"""
  return db.query(CommentLike).filter(
    CommentLike.comment_id == comment_id,
    CommentLike.user_id == user_id
  ).first() is not None
