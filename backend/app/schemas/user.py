from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, computed_field, field_validator

GenderValue = Literal['female', 'male', 'custom']


class UserBase(BaseModel):
  first_name: str
  last_name: str
  birth_date: date | None = None
  gender: GenderValue


  @field_validator('first_name', 'last_name')
  @classmethod
  def validate_name(cls, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
      raise ValueError('Name is required')
    return cleaned


class UserCreate(UserBase):
  email: EmailStr
  phone: str | None = None
  password: str
  

  @field_validator('phone')
  @classmethod
  def normalize_phone(cls, value: str | None) -> str | None:
    if value is None:
      return None

    digits = ''.join(character for character in value if character.isdigit())
    if len(digits) < 9 or len(digits) > 15:
      raise ValueError('Phone must contain 9 to 15 digits')
    return digits

  @field_validator('password')
  @classmethod
  def validate_password(cls, value: str) -> str:
    if len(value) < 8:
      raise ValueError('Password must be at least 8 characters')
    return value

class UserRead(UserBase):
  id: int
  bio: str | None = None
  avatar_url: str | None = None
  email: EmailStr
  phone: str | None = None
  created_at: datetime
  updated_at: datetime

  model_config = ConfigDict(from_attributes=True)

  @computed_field
  @property
  def full_name(self) -> str:
    return ' '.join(part for part in [self.first_name, self.last_name] if part).strip()

class UserUpdate(BaseModel):
  bio: str | None = None
  first_name: str | None = None
  last_name: str | None = None
  phone: str | None = None
  birth_date: date | None = None
  gender: GenderValue | None = None

