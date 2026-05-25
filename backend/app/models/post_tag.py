from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.db_types import UUID_TYPE, uuid_pk

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User

class PostTag(Base):
    __tablename__ = 'post_tags'
    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='uq_post_tags_post_user'),
    )

    id: Mapped[int] = uuid_pk('id')
    post_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(UUID_TYPE, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    post: Mapped["Post"] = relationship("Post", back_populates="tagged_users")
    user: Mapped["User"] = relationship("User", lazy="joined")
