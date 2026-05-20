from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.db_enums import ReportStatus
from app.schemas.user import UserRead


class UserStatusUpdate(BaseModel):
  is_active: bool


class ReportStatusUpdate(BaseModel):
  status: ReportStatus


class PostReportRead(BaseModel):
  post_id: int
  user_id: int
  reason: str | None
  status: ReportStatus
  created_at: datetime
  reporter: UserRead

  model_config = ConfigDict(from_attributes=True)
