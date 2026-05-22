from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserRead, UserSearchRead
from app.schemas.post import PostReadWithAuthor

class AdminUserStatusUpdate(BaseModel):
  is_active: bool

class PaginatedAdminUsersResponse(BaseModel):
  items: list[UserRead]
  total: int
  page: int
  page_size: int
  total_pages: int

class PostReportRead(BaseModel):
  post_id: int
  user_id: int
  reason: str | None = None
  created_at: datetime
  reporter: UserSearchRead
  post: PostReadWithAuthor

  model_config = ConfigDict(from_attributes=True)

class PaginatedPostReportsResponse(BaseModel):
  items: list[PostReportRead]
  total: int
  page: int
  page_size: int
  total_pages: int
