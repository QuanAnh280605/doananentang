from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.post import PostAuthorRead


class LikeStatusResponse(BaseModel):
  """Response sau khi like/unlike"""
  post_id: int | UUID
  liked: bool
  like_count: int


class LikeUserRead(BaseModel):
  """Thông tin người đã thích (dùng trong danh sách)"""
  id: int | UUID
  first_name: str
  last_name: str
  avatar_url: str | None = None

  model_config = ConfigDict(from_attributes=True)


class PostLikersResponse(BaseModel):
  """Danh sách người đã thích bài viết"""
  post_id: int | UUID
  like_count: int
  users: list[LikeUserRead]
