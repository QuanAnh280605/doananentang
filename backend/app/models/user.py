from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
  __tablename__ = 'users'
  __table_args__ = (
    CheckConstraint('email IS NOT NULL OR phone IS NOT NULL', name='ck_users_email_or_phone'),
    CheckConstraint("gender IN ('female', 'male', 'custom')", name='ck_users_gender'),
  )

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
  phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
  hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
  first_name: Mapped[str] = mapped_column(String(100), nullable=False)
  last_name: Mapped[str] = mapped_column(String(100), nullable=False)
  birth_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
  gender: Mapped[str] = mapped_column(String(20), nullable=False, default='custom', server_default='custom')
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
    nullable=False,
  )
