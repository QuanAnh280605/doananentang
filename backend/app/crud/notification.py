from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.db_enums import NotificationType
from app.models.notification import Notification
from app.models.user import User


def create_notification(
  db: Session,
  receiver_id: int,
  actor_id: int,
  type: NotificationType,
  post_id: int | None = None,
  comment_id: int | None = None,
  message_id: int | None = None,
  related_user_id: int | None = None,
) -> Notification | None:
  """Tạo thông báo. Bỏ qua nếu actor và receiver là cùng một người."""
  if receiver_id == actor_id:
    return None

  notification = Notification(
    receiver_id=receiver_id,
    actor_id=actor_id,
    type=type,
    post_id=post_id,
    comment_id=comment_id,
    message_id=message_id,
    related_user_id=related_user_id,
  )
  db.add(notification)
  db.commit()
  db.refresh(notification)
  return notification


def delete_notification(
  db: Session,
  receiver_id: int,
  actor_id: int,
  type: NotificationType,
  post_id: int | None = None,
  related_user_id: int | None = None,
) -> None:
  """Xóa thông báo khi unlike/unfollow."""
  statement = select(Notification).where(
    Notification.receiver_id == receiver_id,
    Notification.actor_id == actor_id,
    Notification.type == type,
  )
  if post_id is not None:
    statement = statement.where(Notification.post_id == post_id)
  if related_user_id is not None:
    statement = statement.where(Notification.related_user_id == related_user_id)

  notification = db.scalar(statement)
  if notification is not None:
    db.delete(notification)
    db.commit()


def get_notifications_for_user(
  db: Session,
  receiver_id: int,
  page: int = 1,
  page_size: int = 20,
) -> tuple[list[dict], int, int]:
  """Lấy danh sách thông báo kèm actor, sắp xếp mới nhất trước."""
  base_where = Notification.receiver_id == receiver_id

  total = int(db.scalar(
    select(func.count()).select_from(Notification).where(base_where)
  ) or 0)
  unread_count = int(db.scalar(
    select(func.count()).select_from(Notification).where(
      base_where, Notification.is_read.is_(False)
    )
  ) or 0)

  skip = (page - 1) * page_size
  rows = db.execute(
    select(Notification, User)
    .join(User, User.id == Notification.actor_id)
    .where(base_where)
    .order_by(Notification.created_at.desc(), Notification.id.desc())
    .offset(skip)
    .limit(page_size)
  ).all()

  items = []
  for notification, actor in rows:
    items.append({
      'id': notification.id,
      'type': notification.type,
      'is_read': notification.is_read,
      'created_at': notification.created_at,
      'actor': {
        'id': actor.id,
        'first_name': actor.first_name,
        'last_name': actor.last_name,
        'full_name': actor.full_name,
        'avatar_url': actor.avatar_url,
      },
      'post_id': notification.post_id,
      'comment_id': notification.comment_id,
      'message_id': notification.message_id,
      'related_user_id': notification.related_user_id,
    })

  return items, total, unread_count


def get_unread_count(db: Session, receiver_id: int) -> int:
  return int(db.scalar(
    select(func.count()).select_from(Notification).where(
      Notification.receiver_id == receiver_id,
      Notification.is_read.is_(False),
    )
  ) or 0)


def mark_notification_read(
  db: Session, notification_id: int, receiver_id: int, is_read: bool
) -> Notification | None:
  notification = db.scalar(
    select(Notification).where(
      Notification.id == notification_id,
      Notification.receiver_id == receiver_id,
    )
  )
  if notification is None:
    return None
  notification.is_read = is_read
  db.commit()
  db.refresh(notification)
  return notification


def mark_all_notifications_read(db: Session, receiver_id: int) -> int:
  """Đánh dấu tất cả là đã đọc. Trả về số bản ghi được cập nhật."""
  result = db.execute(
    update(Notification)
    .where(Notification.receiver_id == receiver_id, Notification.is_read.is_(False))
    .values(is_read=True)
  )
  db.commit()
  return result.rowcount  # type: ignore[return-value]


def get_notification_with_actor(
  db: Session,
  notification_id: int,
  receiver_id: int,
) -> dict | None:
  """Lấy một notification kèm actor dưới dạng dict sẵn sàng validate schema."""
  row = db.execute(
    select(Notification, User)
    .join(User, User.id == Notification.actor_id)
    .where(
      Notification.id == notification_id,
      Notification.receiver_id == receiver_id,
    )
  ).first()

  if row is None:
    return None

  notif, actor = row
  return {
    'id': notif.id,
    'type': notif.type,
    'is_read': notif.is_read,
    'created_at': notif.created_at,
    'actor': {
      'id': actor.id,
      'first_name': actor.first_name,
      'last_name': actor.last_name,
      'full_name': actor.full_name,
      'avatar_url': actor.avatar_url,
    },
    'post_id': notif.post_id,
    'comment_id': notif.comment_id,
    'message_id': notif.message_id,
    'related_user_id': notif.related_user_id,
  }
