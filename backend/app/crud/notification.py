from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.db_enums import NotificationType
from app.models.notification import Notification


def _normalize_notification_type(notification_type: NotificationType | str) -> NotificationType:
  if isinstance(notification_type, NotificationType):
    return notification_type
  return NotificationType(notification_type)


def create_notification(
  db: Session,
  *,
  receiver_id: int,
  actor_id: int,
  type: NotificationType | str,
  post_id: int | None = None,
  comment_id: int | None = None,
  related_user_id: int | None = None,
  message_id: int | None = None,
) -> Notification:
  notification = Notification(
    receiver_id=receiver_id,
    actor_id=actor_id,
    type=_normalize_notification_type(type),
    post_id=post_id,
    comment_id=comment_id,
    related_user_id=related_user_id,
    message_id=message_id,
  )
  db.add(notification)
  db.commit()
  db.refresh(notification)
  return notification


def list_notifications(
  db: Session,
  *,
  receiver_id: int,
  unread_only: bool = False,
  limit: int = 30,
  offset: int = 0,
) -> list[Notification]:
  statement = select(Notification).where(Notification.receiver_id == receiver_id)
  if unread_only:
    statement = statement.where(Notification.is_read.is_(False))
  statement = statement.order_by(Notification.created_at.desc(), Notification.id.desc()).offset(offset).limit(limit)
  return list(db.scalars(statement).all())


def count_unread_notifications(db: Session, *, receiver_id: int) -> int:
  statement = select(func.count()).select_from(Notification).where(
    Notification.receiver_id == receiver_id,
    Notification.is_read.is_(False),
  )
  return int(db.scalar(statement) or 0)


def mark_notification_read(db: Session, *, receiver_id: int, notification_id: int) -> Notification | None:
  statement = select(Notification).where(
    Notification.id == notification_id,
    Notification.receiver_id == receiver_id,
  )
  notification = db.scalar(statement)
  if notification is None:
    return None
  if notification.is_read:
    return notification

  notification.is_read = True
  db.commit()
  db.refresh(notification)
  return notification


def mark_all_notifications_read(db: Session, *, receiver_id: int) -> int:
  notifications = list(db.scalars(
    select(Notification).where(
      Notification.receiver_id == receiver_id,
      Notification.is_read.is_(False),
    )
  ).all())
  if not notifications:
    return 0

  for notification in notifications:
    notification.is_read = True

  db.commit()
  return len(notifications)
