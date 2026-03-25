from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.crud.user import get_user_by_email, get_user_by_id, get_user_by_phone
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserCreate

EMAIL_ADAPTER = TypeAdapter(EmailStr)


def normalize_phone(value: str) -> str:
  digits = ''.join(character for character in value if character.isdigit())
  if len(digits) < 9 or len(digits) > 15:
    raise ValueError('Contact must be a valid email or phone number')
  return digits


def split_contact(contact: str) -> tuple[str | None, str | None]:
  try:
    email = EMAIL_ADAPTER.validate_python(contact)
    return str(email), None
  except ValidationError:
    return None, normalize_phone(contact)


def create_user_from_register(db: Session, payload: RegisterRequest) -> UserCreate:
  email, phone = split_contact(payload.contact)
  return UserCreate(
    email=email,
    phone=phone,
    password=payload.password,
    first_name=payload.first_name,
    last_name=payload.last_name,
    birth_date=payload.birth_date,
    gender=payload.gender,
  )


def get_user_for_identifier(db: Session, identifier: str) -> User | None:
  email, phone = split_contact(identifier)
  if email is not None:
    return get_user_by_email(db, email)
  if phone is not None:
    return get_user_by_phone(db, phone)
  return None


def get_authenticated_user(db: Session, payload: LoginRequest) -> User | None:
  return get_user_for_identifier(db, payload.identifier)


def get_user_for_token(db: Session, subject: str) -> User | None:
  if not subject.isdigit():
    return None
  return get_user_by_id(db, int(subject))
