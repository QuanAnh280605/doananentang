import os
import shutil
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

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


def seed_user(db: Session, email: str) -> User:
  user = User(
    email=email,
    password_hash='hash',
    first_name='Avatar',
    last_name='User',
    gender='female',
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def build_client(db: Session, current_user: User | None = None) -> TestClient:
  app = FastAPI()
  app.include_router(api_router, prefix='/api')
  app.mount('/static', StaticFiles(directory='uploads'), name='static')

  def override_get_db():
    yield db

  def override_current_user() -> User:
    if current_user is None:
      raise AssertionError('current user is required for this test')
    return current_user

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_current_user] = override_current_user
  return TestClient(app)


def test_avatar_upload_and_static_access() -> None:
  # Đảm bảo thư mục upload tồn tại
  uploads_dir = Path('uploads') / 'avatars'
  uploads_dir.mkdir(parents=True, exist_ok=True)

  with build_test_session() as db:
    user = seed_user(db, email='avatar_test@example.com')
    client = build_client(db, user)

    # 1. Test tải lên tệp không phải hình ảnh (Ví dụ tệp văn bản) -> Phải trả về 400
    bad_response = client.patch(
      '/api/users/me/avatar',
      files={'file': ('document.txt', b'some text', 'text/plain')},
    )
    assert bad_response.status_code == 400
    assert bad_response.json()['detail'] == 'File must be an image'

    # 2. Test tải lên tệp hình ảnh hợp lệ (Ví dụ JPEG) -> Phải trả về thành công 200
    response = client.patch(
      '/api/users/me/avatar',
      files={'file': ('avatar.jpg', b'fake-image-bytes', 'image/jpeg')},
    )
    assert response.status_code == 200
    body = response.json()
    assert body['message'] == 'Tải ảnh lên thành công'
    
    avatar_url = body['avatar_url']
    assert '/static/avatars/' in avatar_url
    assert avatar_url.endswith('.jpg')

    # Trích xuất tên tệp thực tế được tạo ra
    filename = avatar_url.split('/')[-1]
    saved_file_path = uploads_dir / filename

    # Kiểm tra xem file có được lưu cục bộ hay không
    assert saved_file_path.exists()
    assert saved_file_path.read_bytes() == b'fake-image-bytes'

    # 3. Test cấu hình truy cập tệp tĩnh: Gửi request GET tới /static/avatars/filename
    # Phải trả về file nội dung chính xác
    static_url = f'/static/avatars/{filename}'
    static_response = client.get(static_url)
    assert static_response.status_code == 200
    assert static_response.content == b'fake-image-bytes'

    # Dọn dẹp tệp đã tạo ra sau khi test xong
    if saved_file_path.exists():
      saved_file_path.unlink()
