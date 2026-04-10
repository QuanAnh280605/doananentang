from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RefreshSession(Base):
  __tablename__ = 'refresh_sessions'

  id: Mapped[int] = mapped_column(primary_key=True)
  user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
  token_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
  token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
  expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
  revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
