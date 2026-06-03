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

