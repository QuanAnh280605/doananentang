from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE, uuid_pk


class LoginSession(Base):
  __tablename__ = 'login_sessions'
  __table_args__ = (
    Index('idx_login_sessions_user_id', 'user_id'),
  )

  id: Mapped[int] = uuid_pk('id')
  user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  refresh_token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
  device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
  ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
  expired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

  @property
  def token_id(self) -> str:
    return str(self.id)

  @property
  def session_id(self) -> int:
    return self.id


RefreshSession = LoginSession
