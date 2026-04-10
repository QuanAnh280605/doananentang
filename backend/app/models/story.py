from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Story(Base):
  __tablename__ = 'stories'
  __table_args__ = (
    Index('idx_stories_user_id', 'user_id'),
  )

  id: Mapped[int] = mapped_column(primary_key=True)
  user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  media_url: Mapped[str] = mapped_column(String(255), nullable=False)
  media_type: Mapped[str] = mapped_column(String(50), nullable=False)
  visibility: Mapped[str] = mapped_column(String(20), nullable=False, default='public', server_default='public')
  expires_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=text("NOW() + INTERVAL '24 hours'"),
  )
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
