from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.crud.comment import create_comment, delete_comment, get_comment, get_comments_by_post
from app.crud.comment_like import get_comment_like_count, is_comment_liked_by_user, like_comment, unlike_comment
from app.crud.post import get_post
from app.models.db_enums import UserRole
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentRead, CommentThreadRead

router = APIRouter()


# ──────────────────────────────────────────────────────────────
# POST /api/comments/post/{post_id} — Tạo bình luận / reply
# ──────────────────────────────────────────────────────────────
@router.post('/post/{post_id}', response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment_endpoint(
  post_id: int,
  payload: CommentCreate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Tạo bình luận mới cho bài viết. Nếu có parent_comment_id thì là reply."""
  # Kiểm tra bài viết tồn tại
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  # Nếu là reply, kiểm tra parent comment tồn tại và cùng bài viết
  if payload.parent_comment_id:
    parent = get_comment(db, payload.parent_comment_id)
    if not parent:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Parent comment not found')
    if parent.post_id != post_id:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Parent comment does not belong to this post')

  comment = create_comment(db, post_id, current_user.id, payload)
  return CommentRead.model_validate(comment)


# ──────────────────────────────────────────────────────────────
# GET /api/comments/post/{post_id} — Lấy danh sách bình luận
# ──────────────────────────────────────────────────────────────
@router.get('/post/{post_id}', response_model=list[CommentThreadRead])
def list_comments(
  post_id: int,
  current_user: User | None = Depends(get_current_user_optional),
  db: Session = Depends(get_db),
):
  """Lấy danh sách bình luận kèm reply cho bài viết."""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  comments = get_comments_by_post(db, post_id, current_user_id=current_user.id if current_user else None)
  return [CommentThreadRead.model_validate(c) for c in comments]


# ──────────────────────────────────────────────────────────────
# POST /api/comments/{comment_id}/like — Thích bình luận
# ──────────────────────────────────────────────────────────────
@router.post('/{comment_id}/like')
def like_comment_endpoint(
  comment_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Thích một bình luận."""
  comment = get_comment(db, comment_id)
  if not comment:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Comment not found')
  
  like_comment(db, comment_id, current_user.id)
  
  return {
    'status': 'liked',
    'like_count': get_comment_like_count(db, comment_id),
    'is_liked': True
  }


# ──────────────────────────────────────────────────────────────
# DELETE /api/comments/{comment_id}/like — Bỏ thích bình luận
# ──────────────────────────────────────────────────────────────
@router.delete('/{comment_id}/like')
def unlike_comment_endpoint(
  comment_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Bỏ thích một bình luận."""
  comment = get_comment(db, comment_id)
  if not comment:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Comment not found')
  
  unlike_comment(db, comment_id, current_user.id)
  
  return {
    'status': 'unliked',
    'like_count': get_comment_like_count(db, comment_id),
    'is_liked': False
  }


# ──────────────────────────────────────────────────────────────
# DELETE /api/comments/{comment_id} — Xóa bình luận
# ──────────────────────────────────────────────────────────────
@router.delete('/{comment_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_comment_endpoint(
  comment_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Xóa bình luận. Chỉ tác giả bình luận hoặc Admin mới có quyền."""
  comment = get_comment(db, comment_id)
  if not comment:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Comment not found')

  # Phân quyền: tác giả comment, tác giả bài viết, hoặc Admin
  post = get_post(db, comment.post_id)
  is_post_author = post and post.author_id == current_user.id
  
  if comment.author_id != current_user.id and not is_post_author and current_user.role != UserRole.ADMIN:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not enough permissions')

  delete_comment(db, comment)
