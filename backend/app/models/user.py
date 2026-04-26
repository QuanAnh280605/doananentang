from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_enums import UserRole, user_role_enum
from app.models.db_types import uuid_pk


class User(Base):
  __tablename__ = 'users'
  __table_args__ = (
    UniqueConstraint('email', name='uq_users_email'),
    UniqueConstraint('phone', name='uq_users_phone'),
  )

  id: Mapped[int] = uuid_pk('id')
  email: Mapped[str] = mapped_column(String(255), nullable=False)
  password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
  first_name: Mapped[str] = mapped_column(String(100), nullable=False)
  last_name: Mapped[str] = mapped_column(String(100), nullable=False)
  avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
  bio: Mapped[str | None] = mapped_column(Text(), nullable=True)
  gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
  city: Mapped[str | None] = mapped_column(String(100), nullable=True)
  date_of_birth: Mapped[date | None] = mapped_column(Date(), nullable=True)
  phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
  headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
  studio: Mapped[str | None] = mapped_column(String(255), nullable=True)
  website: Mapped[str | None] = mapped_column(String(255), nullable=True)
  role: Mapped[UserRole] = mapped_column(user_role_enum, nullable=False, default=UserRole.USER, server_default='user')
  is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True, server_default=text('true'))
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
    nullable=False,
  )

  @property
  def user_id(self) -> int:
    return self.id

  @property
  def hashed_password(self) -> str:
    return self.password_hash

  @hashed_password.setter
  def hashed_password(self, value: str) -> None:
    self.password_hash = value

  @property
  def birth_date(self) -> date | None:
    return self.date_of_birth

  @birth_date.setter
  def birth_date(self, value: date | None) -> None:
    self.date_of_birth = value

  @property
  def full_name(self) -> str:
    return ' '.join(part for part in [self.first_name, self.last_name] if part).strip()
