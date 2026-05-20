from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.notification import (
  count_unread_notifications,
  list_notifications,
  mark_all_notifications_read,
  mark_notification_read,
)
from app.crud.comment import get_comment
from app.crud.user import get_user_by_id
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationRead

router = APIRouter()


def serialize_notification(db: Session, notification: Notification) -> NotificationRead:
  payload = NotificationRead.model_validate(notification)
  updates: dict[str, int | str | None] = {}

  actor = get_user_by_id(db, payload.actor_id)
  if actor is not None:
    updates['actor_name'] = actor.full_name or actor.email
    updates['actor_avatar_url'] = actor.avatar_url

  if payload.post_id is not None or payload.comment_id is None:
    return payload.model_copy(update=updates) if updates else payload

  comment = get_comment(db, payload.comment_id)
  if comment is not None:
    updates['target_post_id'] = comment.post_id

  return payload.model_copy(update=updates) if updates else payload


@router.get('', response_model=NotificationListResponse)
def list_notifications_endpoint(
  unread_only: bool = False,
  limit: int = Query(30, ge=1, le=100),
  offset: int = Query(0, ge=0),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> NotificationListResponse:
  items = [
    serialize_notification(db, notification)
    for notification in list_notifications(
      db,
      receiver_id=current_user.id,
      unread_only=unread_only,
      limit=limit,
      offset=offset,
    )
  ]
  unread_count = count_unread_notifications(db, receiver_id=current_user.id)
  return NotificationListResponse(items=items, unread_count=unread_count)


@router.patch('/read-all', response_model=NotificationListResponse)
def mark_all_notifications_read_endpoint(
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> NotificationListResponse:
  mark_all_notifications_read(db, receiver_id=current_user.id)
  items = [
    serialize_notification(db, notification)
    for notification in list_notifications(db, receiver_id=current_user.id)
  ]
  return NotificationListResponse(items=items, unread_count=0)


@router.patch('/{notification_id}/read', response_model=NotificationRead)
def mark_notification_read_endpoint(
  notification_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> NotificationRead:
  notification = mark_notification_read(db, receiver_id=current_user.id, notification_id=notification_id)
  if notification is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Notification not found')
  return serialize_notification(db, notification)
