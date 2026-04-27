from sqlalchemy.orm import Session, joinedload

from app.crud.comment_like import get_comment_like_count, is_comment_liked_by_user
from app.models.comment import Comment
from app.schemas.comment import CommentCreate


def create_comment(db: Session, post_id: int, author_id: int, comment_in: CommentCreate) -> Comment:
  """Tạo bình luận mới hoặc reply comment."""
  db_comment = Comment(
    post_id=post_id,
    author_id=author_id,
    content=comment_in.content,
    parent_comment_id=comment_in.parent_comment_id,
  )
  db.add(db_comment)
  db.commit()
  db.refresh(db_comment)
  
  # Initialize stats for new comment
  db_comment.like_count = 0
  db_comment.is_liked = False
  
  return db_comment


def get_comment(db: Session, comment_id: int, current_user_id: int | None = None) -> Comment | None:
  """Lấy một bình luận theo ID kèm stats."""
  comment = (
    db.query(Comment)
    .options(joinedload(Comment.author))
    .filter(Comment.id == comment_id, Comment.is_deleted == False)
    .first()
  )
  
  if comment:
    comment.like_count = get_comment_like_count(db, comment.id)
    comment.is_liked = is_comment_liked_by_user(db, comment.id, current_user_id) if current_user_id else False
    
  return comment


def get_comments_by_post(db: Session, post_id: int, current_user_id: int | None = None) -> list[Comment]:
  """Lấy danh sách bình luận gốc của bài viết kèm stats và replies."""
  comments = (
    db.query(Comment)
    .options(
        joinedload(Comment.author),
        joinedload(Comment.replies).joinedload(Comment.author)
    )
    .filter(
      Comment.post_id == post_id,
      Comment.parent_comment_id == None,
      Comment.is_deleted == False,
    )
    .order_by(Comment.created_at.asc())
    .all()
  )
  
  for c in comments:
    c.like_count = get_comment_like_count(db, c.id)
    c.is_liked = is_comment_liked_by_user(db, c.id, current_user_id) if current_user_id else False
    
    # Tính stats cho các reply
    for r in c.replies:
      r.like_count = get_comment_like_count(db, r.id)
      r.is_liked = is_comment_liked_by_user(db, r.id, current_user_id) if current_user_id else False
    
  return comments


def get_replies_by_comment(db: Session, comment_id: int, current_user_id: int | None = None) -> list[Comment]:
  """Lấy danh sách reply của một bình luận kèm stats."""
  comments = (
    db.query(Comment)
    .options(joinedload(Comment.author))
    .filter(
      Comment.parent_comment_id == comment_id,
      Comment.is_deleted == False,
    )
    .order_by(Comment.created_at.asc())
    .all()
  )
  
  for c in comments:
    c.like_count = get_comment_like_count(db, c.id)
    c.is_liked = is_comment_liked_by_user(db, c.id, current_user_id) if current_user_id else False
    
  return comments


def delete_comment(db: Session, db_comment: Comment) -> Comment:
  """Xóa bình luận."""
  db_comment.is_deleted = True
  db_comment.content = "[Bình luận đã bị xóa]"
  db.commit()
  db.refresh(db_comment)
  return db_comment
