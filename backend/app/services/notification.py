import logging

from anyio import from_thread
from sqlalchemy.orm import Session

from app.crud.comment import get_comment
from app.crud.notification import create_notification
from app.crud.user import get_user_by_id
from app.models.notification import Notification
from app.realtime import socket_server
from app.schemas.notification import NOTIFICATION_CREATED_EVENT, NotificationCreatedEvent

logger = logging.getLogger(__name__)


def build_notification_event_payload(db: Session, notification: Notification) -> dict:
  event = NotificationCreatedEvent.model_validate(notification)
  updates: dict[str, int | str | None] = {}

  actor = get_user_by_id(db, notification.actor_id)
  if actor is not None:
    updates['actor_name'] = actor.full_name or actor.email
    updates['actor_avatar_url'] = actor.avatar_url

  if notification.comment_id is not None and notification.post_id is None:
    comment = get_comment(db, notification.comment_id)
    if comment is not None:
      updates['target_post_id'] = comment.post_id

  if updates:
    event = event.model_copy(update=updates)

  return event.model_dump(mode='json')


async def emit_notification_created(notification: Notification, payload: dict | None = None) -> None:
  event_payload = payload or NotificationCreatedEvent.model_validate(notification).model_dump(mode='json')
  await socket_server.sio.emit(
    NOTIFICATION_CREATED_EVENT,
    event_payload,
    room=socket_server.get_user_room_name(notification.receiver_id),
  )


def create_social_notification(
  db: Session,
  *,
  receiver_id: int,
  actor_id: int,
  type: str,
  post_id: int | None = None,
  comment_id: int | None = None,
  related_user_id: int | None = None,
  message_id: int | None = None,
  emit: bool = True,
) -> Notification | None:
  if receiver_id == actor_id:
    return None

  notification = create_notification(
    db,
    receiver_id=receiver_id,
    actor_id=actor_id,
    type=type,
    post_id=post_id,
    comment_id=comment_id,
    related_user_id=related_user_id,
    message_id=message_id,
  )

  if not emit:
    return notification

  try:
    payload = build_notification_event_payload(db, notification)
    from_thread.run(emit_notification_created, notification, payload)
  except Exception:
    logger.exception(
      'Failed to emit notification-created event',
      extra={'notification_id': notification.id, 'receiver_id': notification.receiver_id},
    )
  return notification
