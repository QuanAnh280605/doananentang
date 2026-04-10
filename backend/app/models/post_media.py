from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PostMedia(Base):
  __tablename__ = 'post_media'
  __table_args__ = (
    Index('idx_post_media_post_id', 'post_id'),
  )

  id: Mapped[int] = mapped_column(primary_key=True)
  post_id: Mapped[int] = mapped_column(ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
  media_url: Mapped[str] = mapped_column(String(255), nullable=False)
  media_type: Mapped[str] = mapped_column(String(50), nullable=False)
  order: Mapped[int] = mapped_column('order', Integer(), nullable=False, default=0, server_default=text('0'))
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
