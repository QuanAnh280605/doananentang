from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GroupMember(Base):
  __tablename__ = 'group_members'
  __table_args__ = (
    PrimaryKeyConstraint('group_id', 'user_id'),
  )

  group_id: Mapped[int] = mapped_column(ForeignKey('groups.id', ondelete='CASCADE'), nullable=False)
  user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
  role: Mapped[str] = mapped_column(String(50), nullable=False, default='member', server_default='member')
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
