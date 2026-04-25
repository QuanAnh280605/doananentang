from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.post import PostAuthorRead


class CommentCreate(BaseModel):
  """Schema tạo bình luận mới"""
  content: str
  parent_comment_id: int | UUID | None = None  # None = comment gốc, có giá trị = reply


class CommentAuthorRead(BaseModel):
  """Thông tin tóm tắt tác giả bình luận"""
  id: int | UUID
  first_name: str
  last_name: str
  avatar_url: str | None = None

  model_config = ConfigDict(from_attributes=True)


class CommentRead(BaseModel):
  """Schema đọc bình luận (dùng cho response)"""
  id: int | UUID
  post_id: int | UUID
  author_id: int | UUID
  parent_comment_id: int | UUID | None = None
  content: str
  is_deleted: bool
  created_at: datetime
  updated_at: datetime
  author: CommentAuthorRead
  like_count: int = 0
  is_liked: bool = False

  model_config = ConfigDict(from_attributes=True)


class CommentThreadRead(CommentRead):
  """Schema đọc bình luận kèm danh sách reply (dùng cho thread)"""
  replies: list["CommentRead"] = []

  model_config = ConfigDict(from_attributes=True)
