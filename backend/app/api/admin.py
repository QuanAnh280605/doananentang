import logging
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, delete
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.crud.refresh_session import revoke_all_user_sessions
from app.crud.user import list_users_for_admin, get_user_by_id
from app.crud.post import delete_post, get_post
from app.models.user import User
from app.models.post import Post
from app.models.like import Like
from app.models.comment import Comment
from app.models.db_enums import UserRole
from app.schemas.admin import (
  AdminUserStatusUpdate, 
  PaginatedAdminUsersResponse
)
from app.schemas.user import UserRead

router = APIRouter()
logger = logging.getLogger("app.api.admin")
audit_logger = logging.getLogger("admin_audit")

# ──────────────────────────────────────────────────────────────
# GET /api/admin/users — Danh sách người dùng (Admin)
# ──────────────────────────────────────────────────────────────
@router.get('/users', response_model=PaginatedAdminUsersResponse)
def get_users_for_admin(
  q: str | None = Query(default=None, description="Từ khóa tìm kiếm theo tên, email, sđt"),
  role: UserRole | None = Query(default=None, description="Lọc theo vai trò"),
  is_active: bool | None = Query(default=None, description="Lọc theo trạng thái hoạt động"),
  page: int = Query(default=1, ge=1, description="Trang hiện tại"),
  page_size: int = Query(default=20, ge=1, le=100, description="Số lượng kết quả mỗi trang"),
  current_admin: User = Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  """Lấy danh sách người dùng có phân trang, tìm kiếm và lọc dành cho Admin."""
  result = list_users_for_admin(
    db, q=q, role=role, is_active=is_active, page=page, page_size=page_size
  )
  
  formatted_items = [UserRead.model_validate(user) for user in result['items']]
  result['items'] = formatted_items
  return result

# ──────────────────────────────────────────────────────────────
# PATCH /api/admin/users/{user_id}/status — Khóa/Mở khóa người dùng
# ──────────────────────────────────────────────────────────────
@router.patch('/users/{user_id}/status', response_model=UserRead)
def update_user_status(
  user_id: int,
  payload: AdminUserStatusUpdate,
  current_admin: User = Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  """Khóa hoặc mở khóa một người dùng. Nếu khóa tài khoản, thu hồi toàn bộ session để đăng xuất lập tức."""
  if user_id == current_admin.id:
    err_msg = "Không thể tự thay đổi trạng thái của chính mình"
    audit_logger.error(
      f"[AUDIT_LOG][ERROR] Admin (ID: {current_admin.id}) failed to update status on User (ID: {user_id}). Error: {err_msg}"
    )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

  user = get_user_by_id(db, user_id)
  if user is None or user.is_deleted:
    err_msg = "Người dùng không tồn tại hoặc đã bị xóa"
    audit_logger.error(
      f"[AUDIT_LOG][ERROR] Admin (ID: {current_admin.id}) failed to update status on User (ID: {user_id}). Error: {err_msg}"
    )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)

  old_status = user.is_active
  user.is_active = payload.is_active

  # Nếu khóa user, thu hồi tất cả session của họ để buộc logout ngay lập tức ở mọi thiết bị
  if not payload.is_active:
    revoke_all_user_sessions(db, user.id, commit=False)

  try:
    db.commit()
    db.refresh(user)
    action_str = "lock" if not payload.is_active else "unlock"
    audit_logger.info(
      f"[AUDIT_LOG][SUCCESS] Admin (ID: {current_admin.id}) performed {action_str} on User (ID: {user.id}). Status changed from {old_status} to {user.is_active}."
    )
  except Exception as error:
    db.rollback()
    err_msg = str(error)
    audit_logger.error(
      f"[AUDIT_LOG][ERROR] Admin (ID: {current_admin.id}) failed to update status on User (ID: {user.id}). Error: {err_msg}"
    )
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Lỗi hệ thống khi cập nhật trạng thái người dùng") from error

  return UserRead.model_validate(user)

# ──────────────────────────────────────────────────────────────
# DELETE /api/admin/posts/{post_id} — Soft Delete bài viết vi phạm
# ──────────────────────────────────────────────────────────────
@router.delete('/posts/{post_id}', status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_post(
  post_id: int,
  current_admin: User = Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  """Admin trực tiếp xóa mềm bài viết vi phạm."""
  post = (
    db.query(Post)
    .filter(Post.id == post_id, Post.is_deleted == False)
    .first()
  )

  if post is None:
    err_msg = "Bài viết không tồn tại hoặc đã bị xóa"
    audit_logger.error(
      f"[AUDIT_LOG][ERROR] Admin (ID: {current_admin.id}) failed to delete Post (ID: {post_id}). Error: {err_msg}"
    )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)

  try:
    delete_post(db, post)
    audit_logger.info(
      f"[AUDIT_LOG][SUCCESS] Admin (ID: {current_admin.id}) performed delete on Post (ID: {post_id})."
    )
  except Exception as error:
    err_msg = str(error)
    audit_logger.error(
      f"[AUDIT_LOG][ERROR] Admin (ID: {current_admin.id}) failed to delete Post (ID: {post_id}). Error: {err_msg}"
    )
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Lỗi hệ thống khi xóa bài viết") from error

  return None
