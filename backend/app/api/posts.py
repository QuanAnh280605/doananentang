import shutil
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.crud.like import get_like_count, get_users_who_liked, is_liked_by_user, like_post, unlike_post
from app.crud.post import create_post, delete_post, get_post, get_posts, update_post
from app.models.db_enums import UserRole
from app.models.user import User
from app.schemas.like import LikeStatusResponse, PostLikersResponse
from app.schemas.post import (
  PaginatedPostsResponse,
  PostCreate,
  PostRead,
  PostReadWithAuthor,
  PostUpdate,
)

router = APIRouter()

# Thư mục lưu trữ media bài viết
POST_MEDIA_DIR = Path('uploads') / 'posts'


@router.post('/upload-media', status_code=status.HTTP_201_CREATED)
def upload_post_media(
  files: list[UploadFile] = File(...),
  current_user: User = Depends(get_current_user)
):
  """Tải lên nhiều ảnh cho bài viết (Tối đa 4 ảnh)"""

  # 1. Kiểm tra số lượng file (tối đa 4 file)
  if len(files) > 4:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Bạn chỉ được phép tải lên tối đa 4 ảnh cho mỗi bài viết."
    )

  POST_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
  uploaded_urls = []

  # 2. Duyệt qua từng file do client gửi lên
  for file in files:
    # 2.1. Kiểm tra định dạng (chỉ cho phép định dạng ảnh)
    content_type = file.content_type or ''
    if not content_type.startswith('image/'):
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"File '{file.filename}' không phải là ảnh hợp lệ."
      )

    # 2.2. Tạo tên file duy nhất
    file_ext = file.filename.split('.')[-1] if file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = POST_MEDIA_DIR / unique_filename

    # 2.3. Lưu file vào thư mục uploads/posts
    try:
      with file_path.open('wb') as buffer:
        shutil.copyfileobj(file.file, buffer)
    except IOError as e:
      raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Lỗi lưu file: {str(e)}"
      )

    # 2.4. Lưu URL vào danh sách trả về
    uploaded_urls.append(f"/static/posts/{unique_filename}")
    file.file.close()

  return {
    'message': 'Tải ảnh lên thành công',
    'data': uploaded_urls,
    'total_files': len(uploaded_urls)
  }


# ──────────────────────────────────────────────────────────────
# GET /api/posts — Danh sách bài viết (phân trang + sắp xếp)
# ──────────────────────────────────────────────────────────────
@router.get('', response_model=PaginatedPostsResponse)
def list_posts(
  page: int = Query(1, ge=1, description="Trang hiện tại"),
  page_size: int = Query(10, ge=1, le=50, description="Số bài mỗi trang"),
  sort_by: Literal['created_at', 'updated_at'] = Query('created_at', description="Sắp xếp theo"),
  sort_order: Literal['asc', 'desc'] = Query('desc', description="Thứ tự sắp xếp"),
  author_id: int | None = Query(None, description="Lọc bài viết theo ID tác giả"),
  db: Session = Depends(get_db),
  current_user: User | None = Depends(get_current_user_optional),
):
  """Lấy danh sách bài viết có phân trang, sắp xếp, kèm thông tin tác giả và media."""
  result = get_posts(
    db, 
    page=page, 
    page_size=page_size, 
    sort_by=sort_by, 
    sort_order=sort_order,
    current_user_id=current_user.id if current_user else None,
    author_id=author_id
  )
  return result


# ──────────────────────────────────────────────────────────────
# GET /api/posts/{post_id} — Chi tiết bài viết
# ──────────────────────────────────────────────────────────────
@router.get('/{post_id}', response_model=PostReadWithAuthor)
def get_post_detail(
  post_id: int,
  db: Session = Depends(get_db),
  current_user: User | None = Depends(get_current_user_optional),
):
  """Lấy chi tiết một bài viết kèm tác giả và media. Không yêu cầu đăng nhập."""
  post = get_post(db, post_id, current_user_id=current_user.id if current_user else None)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')
  return PostReadWithAuthor.model_validate(post)


# ──────────────────────────────────────────────────────────────
# POST /api/posts — Tạo bài viết mới
# ──────────────────────────────────────────────────────────────
@router.post('', response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post_endpoint(
  payload: PostCreate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
) -> PostRead:
  """Tạo bài viết mới"""
  post = create_post(db, payload, current_user.id)
  return PostRead.model_validate(post)


# ──────────────────────────────────────────────────────────────
# PATCH /api/posts/{post_id} — Chỉnh sửa bài viết
# ──────────────────────────────────────────────────────────────
@router.patch('/{post_id}', response_model=PostRead)
def update_post_endpoint(
  post_id: int,
  payload: PostUpdate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
) -> PostRead:
  """Chỉnh sửa bài viết (chỉ tác giả)"""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  if post.author_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not enough permissions')

  updated_post = update_post(db, post, payload)
  return PostRead.model_validate(updated_post)


# ──────────────────────────────────────────────────────────────
# DELETE /api/posts/{post_id} — Xóa bài viết
# ──────────────────────────────────────────────────────────────
@router.delete('/{post_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_post_endpoint(
  post_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
):
  """Xóa bài viết (tác giả hoặc quản trị viên)"""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  if post.author_id != current_user.id and current_user.role != UserRole.ADMIN:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not enough permissions')

  delete_post(db, post)


# ──────────────────────────────────────────────────────────────
# POST /api/posts/{post_id}/like — Thích bài viết
# ──────────────────────────────────────────────────────────────
@router.post('/{post_id}/like', response_model=LikeStatusResponse)
def like_post_endpoint(
  post_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Thích bài viết."""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  like_post(db, post_id, current_user.id)
  count = get_like_count(db, post_id)
  return LikeStatusResponse(post_id=post_id, liked=True, like_count=count)


# ──────────────────────────────────────────────────────────────
# DELETE /api/posts/{post_id}/like — Bỏ tương tác bài viết
# ──────────────────────────────────────────────────────────────
@router.delete('/{post_id}/like', response_model=LikeStatusResponse)
def unlike_post_endpoint(
  post_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
):
  """Bỏ tương tác bài viết."""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  unlike_post(db, post_id, current_user.id)
  count = get_like_count(db, post_id)
  return LikeStatusResponse(post_id=post_id, liked=False, like_count=count)


# ──────────────────────────────────────────────────────────────
# GET /api/posts/{post_id}/likes — Danh sách người đã tương tác
# ──────────────────────────────────────────────────────────────
@router.get('/{post_id}/likes', response_model=PostLikersResponse)
def get_post_likers(
  post_id: int,
  db: Session = Depends(get_db),
):
  """Lấy danh sách người dùng đã like bài viết."""
  post = get_post(db, post_id)
  if not post:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Post not found')

  users = get_users_who_liked(db, post_id)
  count = get_like_count(db, post_id)
  
  return PostLikersResponse(
      post_id=post_id, 
      like_count=count, 
      users=users
  )
