from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, ForeignKey, Integer, Text, String, desc, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Post(Base):
  __tablename__ = 'posts'
  __table_args__ = (
    Index('idx_posts_author_id', 'author_id'),
    Index('idx_posts_created_at', desc('created_at'), postgresql_where=text('is_deleted = FALSE')),
  )

  id: Mapped[int] = mapped_column(primary_key=True)
  author_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  content: Mapped[str | None] = mapped_column(Text(), nullable=True)
  reported_count: Mapped[int] = mapped_column(Integer(), nullable=False, default=0, server_default=text('0'))
  is_deleted: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default=text('false'))
  visibility: Mapped[str] = mapped_column(String(20), nullable=False, default='public', server_default='public')
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
  updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
