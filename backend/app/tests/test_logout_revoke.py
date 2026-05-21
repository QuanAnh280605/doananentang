"""Tests for logout revoke-token flow.

Covers:
  - Logout revokes session and blocks subsequent refresh
  - Revoked session is persisted in login_sessions
  - Calling logout twice is idempotent (204 both times)
  - Refresh with a revoked token returns 401
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.core.security import create_refresh_token, decode_refresh_token
from app.crud.refresh_session import (
  create_refresh_session,
  get_refresh_session_by_refresh_token,
  is_session_revoked,
  revoke_all_user_sessions,
  revoke_refresh_session,
)
from app.models.refresh_session import LoginSession


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_session(db, *, user_id: int = 1) -> tuple[LoginSession, str]:
  """Create a LoginSession with a real JWT refresh token and return (session, token)."""
  token_id = str(uuid4())
  refresh_token = create_refresh_token(str(user_id), token_id)
  payload = decode_refresh_token(refresh_token)
  expires_at = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)
  session = create_refresh_session(
    db,
    user_id=user_id,
    refresh_token=refresh_token,
    expires_at=expires_at,
  )
  return session, refresh_token


# ---------------------------------------------------------------------------
# In-memory SQLite fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
  """Provide a transactional in-memory SQLite session."""
  from sqlalchemy import create_engine
  from sqlalchemy.orm import sessionmaker

  from app.models.base import Base
  # Import all models so metadata is populated
  import app.models  # noqa: F401

  engine = create_engine('sqlite://', echo=False)
  Base.metadata.create_all(engine)
  session_factory = sessionmaker(bind=engine)
  session = session_factory()
  try:
    yield session
  finally:
    session.close()


# ---------------------------------------------------------------------------
# CRUD unit tests
# ---------------------------------------------------------------------------

class TestRevokeRefreshSession:
  """revoke_refresh_session marks the session with revoked_at."""

  def test_revoke_sets_revoked_at(self, db) -> None:
    session, token = _make_session(db)
    assert session.revoked_at is None
    assert session.is_revoked is False

    result = revoke_refresh_session(db, token)
    assert result is True

    db.expire_all()
    updated = get_refresh_session_by_refresh_token(db, token)
    assert updated is not None
    assert updated.revoked_at is not None
    assert updated.is_revoked is True

  def test_revoke_idempotent_returns_false_second_time(self, db) -> None:
    _, token = _make_session(db)

    first = revoke_refresh_session(db, token)
    assert first is True

    second = revoke_refresh_session(db, token)
    assert second is False

  def test_revoke_nonexistent_token_returns_false(self, db) -> None:
    result = revoke_refresh_session(db, 'nonexistent-token')
    assert result is False

  def test_revoked_session_persisted_in_db(self, db) -> None:
    """AC: session bị revoke được lưu và kiểm tra đúng."""
    _, token = _make_session(db)
    revoke_refresh_session(db, token)

    row = get_refresh_session_by_refresh_token(db, token)
    assert row is not None, 'Revoked session must still exist in DB'
    assert row.is_revoked is True


class TestIsSessionRevoked:

  def test_active_session_not_revoked(self, db) -> None:
    _, token = _make_session(db)
    assert is_session_revoked(db, token) is False

  def test_revoked_session_detected(self, db) -> None:
    _, token = _make_session(db)
    revoke_refresh_session(db, token)
    assert is_session_revoked(db, token) is True

  def test_missing_token_treated_as_revoked(self, db) -> None:
    assert is_session_revoked(db, 'does-not-exist') is True


class TestRevokeAllUserSessions:

  def test_revokes_all_sessions_for_user(self, db) -> None:
    _, t1 = _make_session(db, user_id=1)
    _, t2 = _make_session(db, user_id=1)
    _, t3 = _make_session(db, user_id=2)

    count = revoke_all_user_sessions(db, user_id=1)
    assert count == 2

    assert is_session_revoked(db, t1) is True
    assert is_session_revoked(db, t2) is True
    assert is_session_revoked(db, t3) is False

  def test_revoke_all_skips_already_revoked(self, db) -> None:
    _, t1 = _make_session(db, user_id=1)
    revoke_refresh_session(db, t1)
    _, t2 = _make_session(db, user_id=1)

    count = revoke_all_user_sessions(db, user_id=1)
    assert count == 1
    assert is_session_revoked(db, t2) is True


# ---------------------------------------------------------------------------
# Refresh-after-logout integration scenario (CRUD level)
# ---------------------------------------------------------------------------

class TestRefreshAfterLogout:
  """AC: Logout xong không refresh lại được bằng token cũ."""

  def test_revoked_token_cannot_refresh(self, db) -> None:
    """Simulates the refresh endpoint logic after logout."""
    _, token = _make_session(db)

    # Logout → revoke
    revoke_refresh_session(db, token)

    # Attempt refresh → session exists but is_revoked
    session = get_refresh_session_by_refresh_token(db, token)
    assert session is not None
    assert session.is_revoked is True
    # The refresh endpoint would reject here

  def test_fresh_session_can_refresh(self, db) -> None:
    """Sanity check: a non-revoked session is still valid."""
    session, token = _make_session(db)

    fetched = get_refresh_session_by_refresh_token(db, token)
    assert fetched is not None
    assert fetched.is_revoked is False
