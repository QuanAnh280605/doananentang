from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.db_enums import MediaType, VisibilityLevel


class PostBase(BaseModel):
  content: str | None = None
  visibility: VisibilityLevel = VisibilityLevel.PUBLIC

class PostCreate(PostBase):
  # Field giúp nhận một mảng chuỗi (tối đa 4 phần tử) từ payload
  media_urls: list[str] | None = Field(default=None, max_length=4)

class PostMediaRead(BaseModel):
  id: int | UUID
  file_url: str
  type: MediaType
  display_order: int

  model_config = ConfigDict(from_attributes=True)


class PostUpdate(BaseModel):
  content: str | None = None
  visibility: VisibilityLevel | None = None


# Schema tóm tắt thông tin tác giả (chỉ lấy các trường cần thiết)
class PostAuthorRead(BaseModel):
  id: int | UUID
  first_name: str
  last_name: str
  avatar_url: str | None = None

  model_config = ConfigDict(from_attributes=True)


class PostRead(PostBase):
  id: int | UUID
  author_id: int | UUID
  reported_count: int
  is_deleted: bool
  created_at: datetime
  updated_at: datetime
  media: list[PostMediaRead] = []
  like_count: int = 0
  comment_count: int = 0
  is_liked: bool = False

  model_config = ConfigDict(from_attributes=True)


# Schema đầy đủ: bài viết + thông tin tác giả (dùng cho list & detail API)
class PostReadWithAuthor(PostRead):
  author: PostAuthorRead

  model_config = ConfigDict(from_attributes=True)


# Schema phân trang
class PaginatedPostsResponse(BaseModel):
  items: list[PostReadWithAuthor]
  total: int
  page: int
  page_size: int
  total_pages: int
