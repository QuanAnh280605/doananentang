from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.refresh_session import LoginSession


def create_refresh_session(
  db: Session,
  *,
  user_id: int,
  refresh_token: str,
  expires_at: datetime,
  commit: bool = True,
) -> LoginSession:
  session = LoginSession(
    user_id=user_id,
    refresh_token=refresh_token,
    expired_at=expires_at,
  )
  db.add(session)
  if commit:
    db.commit()
    db.refresh(session)
  return session


def get_refresh_session_by_refresh_token(db: Session, refresh_token: str) -> LoginSession | None:
  statement = select(LoginSession).where(LoginSession.refresh_token == refresh_token)
  return db.scalar(statement)


def revoke_refresh_session(
  db: Session,
  refresh_token: str,
  *,
  now: datetime | None = None,
  commit: bool = True,
) -> bool:
  """Mark a session as revoked by setting revoked_at instead of deleting.

  Returns True if a live session was revoked, False if nothing changed
  (already revoked or not found).
  """
  current_time = now or datetime.now(timezone.utc)
  statement = (
    update(LoginSession)
    .where(
      LoginSession.refresh_token == refresh_token,
      LoginSession.revoked_at.is_(None),
      LoginSession.expired_at > current_time,
    )
    .values(revoked_at=current_time)
    .execution_options(synchronize_session='fetch')
  )
  result = db.execute(statement)
  if commit:
    db.commit()
  return result.rowcount > 0


def is_session_revoked(db: Session, refresh_token: str) -> bool:
  """Check whether the session for a given refresh token has been revoked."""
  session = get_refresh_session_by_refresh_token(db, refresh_token)
  if session is None:
    return True
  return session.is_revoked


def revoke_all_user_sessions(
  db: Session,
  user_id: int,
  *,
  now: datetime | None = None,
  commit: bool = True,
) -> int:
  """Revoke every active session for a user (e.g. after password change)."""
  current_time = now or datetime.now(timezone.utc)
  statement = (
    update(LoginSession)
    .where(
      LoginSession.user_id == user_id,
      LoginSession.revoked_at.is_(None),
      LoginSession.expired_at > current_time,
    )
    .values(revoked_at=current_time)
    .execution_options(synchronize_session='fetch')
  )
  result = db.execute(statement)
  if commit:
    db.commit()
  return result.rowcount or 0


def delete_expired_refresh_sessions(db: Session, *, now: datetime | None = None) -> int:
  current_time = now or datetime.now(timezone.utc)
  statement = delete(LoginSession).where(LoginSession.expired_at <= current_time)
  statement = statement.execution_options(synchronize_session=False)
  result = db.execute(statement)
  db.commit()
  return result.rowcount or 0
