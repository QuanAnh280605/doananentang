from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.db_enums import MediaType, VisibilityLevel


class StoryCreate(BaseModel):
  file_url: str
  media_url: str | None = None
  caption: str | None = None
  type: MediaType = MediaType.IMAGE
  visibility: VisibilityLevel = VisibilityLevel.PUBLIC

  @model_validator(mode='before')
  @classmethod
  def populate_file_url(cls, data):
    if isinstance(data, dict):
      if 'media_url' in data and ('file_url' not in data or data['file_url'] is None):
        data['file_url'] = data['media_url']
    return data


class StoryAuthorRead(BaseModel):
  id: int | UUID
  first_name: str
  last_name: str
  avatar_url: str | None = None

  model_config = ConfigDict(from_attributes=True)


class StoryRead(BaseModel):
  id: int | UUID
  user_id: int | UUID
  file_url: str
  caption: str | None = None
  type: MediaType
  visibility: VisibilityLevel
  expired_at: datetime
  created_at: datetime
  view_count: int = 0
  is_viewed: bool = False
  author: StoryAuthorRead

  model_config = ConfigDict(from_attributes=True)


class StoryViewStatus(BaseModel):
  story_id: int | UUID
  viewed: bool
  view_count: int
