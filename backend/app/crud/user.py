from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate


def create_user(db: Session, payload: UserCreate) -> User:
  user = User(email=str(payload.email), full_name=payload.full_name)
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def get_user_by_email(db: Session, email: str) -> User | None:
  statement = select(User).where(User.email == email)
  return db.scalar(statement)


def get_user_by_id(db: Session, user_id: int) -> User | None:
  statement = select(User).where(User.id == user_id)
  return db.scalar(statement)


def list_users(db: Session) -> list[User]:
  statement = select(User).order_by(User.id)
  return list(db.scalars(statement).all())
