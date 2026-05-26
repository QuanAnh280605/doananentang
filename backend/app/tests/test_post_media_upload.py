import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.router import api_router
from app.core.database import get_db
from app.models.user import User
from app.models.post import Post


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Post.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, email: str = "uploader@example.com") -> User:
  user = User(
    email=email,
    password_hash="hash",
    first_name="Uploader",
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


class TestPostMediaUploadAPI:
  """AC: API integration tests for local post image upload (#22)"""

  def test_upload_single_image_success(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi 1 tệp tin ảnh JPEG hợp lệ
      response = client.post(
        "/api/posts/upload-media",
        files=[("files", ("test_image.jpg", b"fake jpeg content", "image/jpeg"))]
      )

      assert response.status_code == 201
      body = response.json()
      assert body["message"] == "Tải ảnh lên thành công"
      assert body["total_files"] == 1
      assert len(body["data"]) == 1
      assert body["data"][0].startswith("/static/posts/")
      assert body["data"][0].endswith(".jpg")

  def test_upload_multiple_images_success(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi 3 tệp tin ảnh khác nhau (JPEG, PNG, WEBP)
      response = client.post(
        "/api/posts/upload-media",
        files=[
          ("files", ("image1.jpg", b"fake jpeg data", "image/jpeg")),
          ("files", ("image2.png", b"fake png data", "image/png")),
          ("files", ("image3.webp", b"fake webp data", "image/webp")),
        ]
      )

      assert response.status_code == 201
      body = response.json()
      assert body["total_files"] == 3
      assert len(body["data"]) == 3
      assert body["data"][0].endswith(".jpg")
      assert body["data"][1].endswith(".png")
      assert body["data"][2].endswith(".webp")

  def test_upload_exceeds_max_files_limit(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi 5 tệp tin ảnh (Vượt quá giới hạn tối đa 4 tệp)
      response = client.post(
        "/api/posts/upload-media",
        files=[
          ("files", ("img1.jpg", b"content", "image/jpeg")),
          ("files", ("img2.jpg", b"content", "image/jpeg")),
          ("files", ("img3.jpg", b"content", "image/jpeg")),
          ("files", ("img4.jpg", b"content", "image/jpeg")),
          ("files", ("img5.jpg", b"content", "image/jpeg")),
        ]
      )

      assert response.status_code == 400
      assert "tối đa 4 ảnh" in response.json()["detail"]

  def test_upload_invalid_mime_type_fails(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi tệp tin không phải ảnh (text/plain)
      response = client.post(
        "/api/posts/upload-media",
        files=[("files", ("script.txt", b"plain text content", "text/plain"))]
      )

      assert response.status_code == 400
      assert "không được hỗ trợ" in response.json()["detail"]

  def test_upload_invalid_file_extension_fails(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Gửi tệp tin JPEG nhưng extension nguy hiểm (.exe)
      response = client.post(
        "/api/posts/upload-media",
        files=[("files", ("dangerous.exe", b"executable content", "image/jpeg"))]
      )

      assert response.status_code == 400
      assert "Đuôi mở rộng" in response.json()["detail"]

  def test_upload_image_too_large_fails(self) -> None:
    with build_test_session() as db:
      user = seed_user(db)
      client = build_client(db, user)

      # Tạo tệp tin giả lập vượt quá 5MB
      large_content = b"0" * (5 * 1024 * 1024 + 100)  # > 5MB
      response = client.post(
        "/api/posts/upload-media",
        files=[("files", ("large_image.jpg", large_content, "image/jpeg"))]
      )

      assert response.status_code == 400
      assert "vượt quá dung lượng" in response.json()["detail"]
