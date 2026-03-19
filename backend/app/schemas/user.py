from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
  email: EmailStr
  full_name: str


class UserRead(BaseModel):
  id: int
  email: EmailStr
  full_name: str
  created_at: datetime

  model_config = ConfigDict(from_attributes=True)
