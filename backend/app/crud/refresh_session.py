from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.refresh_session import RefreshSession


def create_refresh_session(
  db: Session,
  *,
  user_id: int,
  token_id: str,
  token_hash: str,
  expires_at: datetime,
  commit: bool = True,
) -> RefreshSession:
  session = RefreshSession(
    user_id=user_id,
    token_id=token_id,
    token_hash=token_hash,
    expires_at=expires_at,
  )
  db.add(session)
  if commit:
    db.commit()
    db.refresh(session)
  return session


def get_refresh_session_by_token_id(db: Session, token_id: str) -> RefreshSession | None:
  statement = select(RefreshSession).where(RefreshSession.token_id == token_id)
  return db.scalar(statement)


def revoke_refresh_session(db: Session, token_id: str, *, now: datetime | None = None, commit: bool = True) -> bool:
  revoked_at = now or datetime.now(timezone.utc)
  statement = (
    update(RefreshSession)
    .where(
      RefreshSession.token_id == token_id,
      RefreshSession.revoked_at.is_(None),
      RefreshSession.expires_at > revoked_at,
    )
    .values(revoked_at=revoked_at)
    .execution_options(synchronize_session=False)
  )
  result = db.execute(statement)
  if commit:
    db.commit()
  return result.rowcount > 0


def delete_expired_refresh_sessions(db: Session, *, now: datetime | None = None) -> int:
  current_time = now or datetime.now(timezone.utc)
  statement = delete(RefreshSession).where(RefreshSession.expires_at <= current_time)
  statement = statement.execution_options(synchronize_session=False)
  result = db.execute(statement)
  db.commit()
  return result.rowcount or 0
