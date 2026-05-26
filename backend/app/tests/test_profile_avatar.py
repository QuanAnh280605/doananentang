import os
import shutil
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.database import get_db
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, email: str = "profile_uploader@example.com") -> User:
  user = User(
    email=email,
    password_hash="hash",
    first_name="Avatar",
    last_name="User",
    gender="male",
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def build_client(db: Session, current_user: User | None = None) -> TestClient:
  app = FastAPI()
  app.include_router(api_router, prefix='/api')

  def override_get_db():
    yield db

  def override_current_user() -> User:
    if current_user is None:
      raise AssertionError('current user is required for this test')
    return current_user

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_current_user] = override_current_user
  return TestClient(app)


@pytest.fixture
def cleanup_uploaded_avatars():
  # Trước khi test, ghi nhận các file đang có
  avatar_dir = Path('uploads') / 'avatars'
  pre_test_files = set(avatar_dir.glob('*')) if avatar_dir.exists() else set()
  
  yield
  
  # Sau khi test, xoá toàn bộ các file mới sinh ra
  if avatar_dir.exists():
    post_test_files = set(avatar_dir.glob('*'))
    new_files = post_test_files - pre_test_files
    for file in new_files:
      try:
        if file.is_file():
          file.unlink()
      except Exception:
        pass


class TestProfileAvatarAPI:
  """AC: API integration tests for local avatar upload (#5)"""

  def test_upload_avatar_success(self, cleanup_uploaded_avatars) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi 1 tệp tin ảnh JPEG hợp lệ
      response = client.patch(
        "/api/users/me/avatar",
        files={"file": ("test_avatar.jpg", b"fake jpeg content", "image/jpeg")}
      )

      assert response.status_code == 200
      body = response.json()
      assert body["message"] == "Tải ảnh lên thành công"
      assert "/static/avatars/" in body["avatar_url"]
      assert body["avatar_url"].endswith(".jpg")

      # Kiểm tra database xem user.avatar_url đã được cập nhật chưa
      db.refresh(user)
      assert user.avatar_url == body["avatar_url"]

  def test_upload_avatar_png_success(self, cleanup_uploaded_avatars) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi 1 tệp tin ảnh PNG hợp lệ
      response = client.patch(
        "/api/users/me/avatar",
        files={"file": ("avatar.png", b"fake png content", "image/png")}
      )

      assert response.status_code == 200
      body = response.json()
      assert body["message"] == "Tải ảnh lên thành công"
      assert body["avatar_url"].endswith(".png")

  def test_upload_avatar_invalid_mime_fails(self, cleanup_uploaded_avatars) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi tệp tin không phải ảnh (text/plain)
      response = client.patch(
        "/api/users/me/avatar",
        files={"file": ("script.txt", b"plain text content", "text/plain")}
      )

      assert response.status_code == 400
      assert "không được hỗ trợ" in response.json()["detail"]

  def test_upload_avatar_invalid_extension_fails(self, cleanup_uploaded_avatars) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi tệp tin JPEG nhưng extension nguy hiểm (.exe)
      response = client.patch(
        "/api/users/me/avatar",
        files={"file": ("dangerous.exe", b"executable content", "image/jpeg")}
      )

      assert response.status_code == 400
      assert "Đuôi mở rộng" in response.json()["detail"]

  def test_upload_avatar_too_large_fails(self, cleanup_uploaded_avatars) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Tạo tệp tin giả lập vượt quá 5MB
      large_content = b"0" * (5 * 1024 * 1024 + 100)  # > 5MB
      response = client.patch(
        "/api/users/me/avatar",
        files={"file": ("large_image.jpg", large_content, "image/jpeg")}
      )

      assert response.status_code == 400
      assert "vượt quá dung lượng" in response.json()["detail"]
