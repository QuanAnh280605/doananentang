from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


def create_user(db: Session, payload: UserCreate) -> User:
  user = User(
    email=str(payload.email),
    phone=payload.phone,
    password_hash=hash_password(payload.password),
    first_name=payload.first_name,
    last_name=payload.last_name,
    date_of_birth=payload.birth_date,
    gender=payload.gender,
  )
  db.add(user)
  try:
    db.commit()
  except IntegrityError:
    db.rollback()
    raise
  db.refresh(user)
  return user


def get_user_by_email(db: Session, email: str) -> User | None:
  statement = select(User).where(User.email == email)
  return db.scalar(statement)


def get_user_by_phone(db: Session, phone: str) -> User | None:
  statement = select(User).where(User.phone == phone)
  return db.scalar(statement)


def get_user_by_id(db: Session, user_id: int) -> User | None:
  statement = select(User).where(User.__table__.c.id == user_id)
  return db.scalar(statement)


def list_users(db: Session) -> list[User]:
  statement = select(User).order_by(User.__table__.c.id)
  return list(db.scalars(statement).all())
  