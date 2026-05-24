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
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.api.router import api_router
from app.core.security import create_refresh_token, decode_refresh_token, hash_password
from app.crud.refresh_session import (
  create_refresh_session,
  get_refresh_session_by_refresh_token,
  is_session_revoked,
  revoke_all_user_sessions,
  revoke_refresh_session,
)
from app.models.refresh_session import LoginSession
from app.models.user import User


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


# ---------------------------------------------------------------------------
# API Router Integration Tests
# ---------------------------------------------------------------------------

class TestAuthRouterLogoutRevoke:
  """AC: API integration tests for logout revoke-token flow."""

  def _build_test_session(self) -> Session:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.models.base import Base
    import app.models  # noqa: F401

    engine = create_engine(
      'sqlite+pysqlite:///:memory:',
      connect_args={'check_same_thread': False},
      poolclass=StaticPool,
      future=True,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return session_factory()

  def _build_client(self, db, current_user: User | None = None) -> TestClient:
    app = FastAPI()
    app.include_router(api_router, prefix='/api')

    def override_get_db():
      yield db

    app.dependency_overrides[get_db] = override_get_db

    if current_user is not None:
      def override_current_user() -> User:
        return current_user
      app.dependency_overrides[get_current_user] = override_current_user

    return TestClient(app)

  def _seed_user(self, db, raw_password: str = "Password123") -> User:
    user = User(
      email=f"test_{uuid4()}@example.com",
      password_hash=hash_password(raw_password),
      first_name="Test",
      last_name="User",
      gender="male",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

  def test_api_logout_success_and_revokes_session(self) -> None:
    with self._build_test_session() as db:
      user = self._seed_user(db)
      session, token = _make_session(db, user_id=user.id)

      client = self._build_client(db)
      response = client.post("/api/auth/logout", json={"refresh_token": token})
      assert response.status_code == 204

      db.expire_all()
      updated = get_refresh_session_by_refresh_token(db, token)
      assert updated is not None
      assert updated.is_revoked is True
      assert updated.revoked_at is not None

  def test_api_refresh_blocked_after_logout(self) -> None:
    with self._build_test_session() as db:
      user = self._seed_user(db)
      session, token = _make_session(db, user_id=user.id)

      client = self._build_client(db)
      logout_response = client.post("/api/auth/logout", json={"refresh_token": token})
      assert logout_response.status_code == 204

      refresh_response = client.post("/api/auth/refresh", json={"refresh_token": token})
      assert refresh_response.status_code == 401
      assert refresh_response.json()["detail"] == "Invalid credentials"

  def test_api_logout_idempotency(self) -> None:
    with self._build_test_session() as db:
      user = self._seed_user(db)
      session, token = _make_session(db, user_id=user.id)

      client = self._build_client(db)
      r1 = client.post("/api/auth/logout", json={"refresh_token": token})
      assert r1.status_code == 204

      r2 = client.post("/api/auth/logout", json={"refresh_token": token})
      assert r2.status_code == 204

  def test_api_change_password_revokes_all_sessions(self) -> None:
    with self._build_test_session() as db:
      user = self._seed_user(db)
      _, t1 = _make_session(db, user_id=user.id)
      _, t2 = _make_session(db, user_id=user.id)

      client = self._build_client(db, current_user=user)

      response = client.post(
        "/api/auth/change-password",
        json={"current_password": "Password123", "new_password": "NewPassword123"}
      )
      assert response.status_code == 200
      assert response.json()["message"] == "Đổi mật khẩu thành công"

      db.expire_all()
      s1 = get_refresh_session_by_refresh_token(db, t1)
      s2 = get_refresh_session_by_refresh_token(db, t2)
      assert s1 is not None and s1.is_revoked is True
      assert s2 is not None and s2.is_revoked is True

