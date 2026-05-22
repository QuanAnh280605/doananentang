from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate
from app.models.db_enums import UserRole


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


import math

def search_users(db: Session, query: str, page: int = 1, page_size: int = 20) -> dict:
  normalized_query = query.strip().lower()
  if not normalized_query:
    return {
      'items': [],
      'total': 0,
      'page': page,
      'page_size': page_size,
      'total_pages': 0,
    }

  pattern = f'%{normalized_query}%'
  full_name = User.first_name.concat(' ').concat(User.last_name)

  base_query = select(User).where(
    or_(
      User.first_name.ilike(pattern),
      User.last_name.ilike(pattern),
      full_name.ilike(pattern),
    )
  )

  total = db.scalar(select(func.count()).select_from(base_query.subquery())) or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  statement = (
    base_query
    .order_by(User.first_name, User.last_name, User.id)
    .offset((page - 1) * page_size)
    .limit(page_size)
  )
  items = list(db.scalars(statement).all())

  return {
    'items': items,
    'total': total,
    'page': page,
    'page_size': page_size,
    'total_pages': total_pages,
  }


def list_users_for_admin(
  db: Session,
  q: str | None = None,
  role: UserRole | None = None,
  is_active: bool | None = None,
  page: int = 1,
  page_size: int = 20
) -> dict:
  base_query = select(User).where(User.is_deleted == False)

  if q:
    normalized_query = q.strip().lower()
    if normalized_query:
      pattern = f'%{normalized_query}%'
      full_name = User.first_name.concat(' ').concat(User.last_name)
      base_query = base_query.where(
        or_(
          User.first_name.ilike(pattern),
          User.last_name.ilike(pattern),
          full_name.ilike(pattern),
          User.email.ilike(pattern),
          User.phone.ilike(pattern),
        )
      )

  if role is not None:
    base_query = base_query.where(User.role == role)

  if is_active is not None:
    base_query = base_query.where(User.is_active == is_active)

  total = db.scalar(select(func.count()).select_from(base_query.subquery())) or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  statement = (
    base_query
    .order_by(User.created_at.desc(), User.id)
    .offset((page - 1) * page_size)
    .limit(page_size)
  )
  items = list(db.scalars(statement).all())

  return {
    'items': items,
    'total': total,
    'page': page,
    'page_size': page_size,
    'total_pages': total_pages,
  }
