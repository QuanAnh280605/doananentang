from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.db_types import UUID_TYPE


class Follow(Base):
  __tablename__ = 'follows'
  __table_args__ = (
    PrimaryKeyConstraint('follower_id', 'following_id'),
    CheckConstraint('follower_id != following_id', name='ck_follows_no_self_follow'),
    Index('idx_follows_following_id', 'following_id'),
  )

  follower_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  following_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
