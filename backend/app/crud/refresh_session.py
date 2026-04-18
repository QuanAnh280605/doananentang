from datetime import datetime, timezone

from sqlalchemy import delete, select
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


def revoke_refresh_session(db: Session, refresh_token: str, *, now: datetime | None = None, commit: bool = True) -> bool:
  current_time = now or datetime.now(timezone.utc)
  statement = delete(LoginSession).where(
    LoginSession.refresh_token == refresh_token,
    LoginSession.expired_at > current_time,
  )
  statement = statement.execution_options(synchronize_session=False)
  result = db.execute(statement)
  if commit:
    db.commit()
  return result.rowcount > 0


def delete_expired_refresh_sessions(db: Session, *, now: datetime | None = None) -> int:
  current_time = now or datetime.now(timezone.utc)
  statement = delete(LoginSession).where(LoginSession.expired_at <= current_time)
  statement = statement.execution_options(synchronize_session=False)
  result = db.execute(statement)
  db.commit()
  return result.rowcount or 0
