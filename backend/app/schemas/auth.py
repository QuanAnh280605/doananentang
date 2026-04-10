from datetime import date

from pydantic import BaseModel, field_validator

from app.schemas.user import GenderValue, UserRead


class RegisterRequest(BaseModel):
  contact: str
  password: str
  first_name: str
  last_name: str
  birth_date: date | None = None
  gender: GenderValue

  @field_validator('contact', 'first_name', 'last_name')
  @classmethod
  def validate_text(cls, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
      raise ValueError('Field is required')
    return cleaned

  @field_validator('password')
  @classmethod
  def validate_password(cls, value: str) -> str:
    if len(value) < 8:
      raise ValueError('Password must be at least 8 characters')
    return value


class LoginRequest(BaseModel):
  identifier: str
  password: str

  @field_validator('identifier', 'password')
  @classmethod
  def validate_text(cls, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
      raise ValueError('Field is required')
    return cleaned


class AuthResponse(BaseModel):
  access_token: str
  refresh_token: str
  token_type: str = 'bearer'
  user: UserRead


class RefreshTokenRequest(BaseModel):
  refresh_token: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
