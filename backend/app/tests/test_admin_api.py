import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient

from app.api.deps import get_db, get_current_user, get_current_user_optional
from app.api.router import api_router
from app.core.security import hash_password
from app.models.user import User
from app.models.post import Post
from app.models.post_report import PostReport
from app.models.refresh_session import RefreshSession
from app.models.like import Like
from app.models.comment import Comment
from app.models.post_media import PostMedia
from app.models.db_enums import UserRole


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Post.__table__.create(bind=engine)
  PostReport.__table__.create(bind=engine)
  RefreshSession.__table__.create(bind=engine)
  Like.__table__.create(bind=engine)
  Comment.__table__.create(bind=engine)
  PostMedia.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, email: str, role: UserRole = UserRole.USER, is_active: bool = True) -> User:
  user = User(
    email=email,
    password_hash=hash_password("Password123"),
    first_name="Test",
    last_name="User",
    role=role,
    is_active=is_active,
    gender="female",
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def build_client(db: Session, current_user: User | None = None) -> TestClient:
  app_instance = FastAPI()
  app_instance.include_router(api_router, prefix='/api')

  def override_get_db():
    yield db

  app_instance.dependency_overrides[get_db] = override_get_db

  if current_user is not None:
    def override_current_user(db_session: Session = Depends(get_db)) -> User:
      db_user = db_session.query(User).filter(User.id == current_user.id).first()
      if db_user is None:
        raise HTTPException(status_code=401, detail='Invalid credentials')
      if not db_user.is_active or db_user.is_deleted:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa hoặc không hoạt động")
      return db_user

    def override_current_user_optional(db_session: Session = Depends(get_db)) -> User | None:
      db_user = db_session.query(User).filter(User.id == current_user.id).first()
      if db_user is None or not db_user.is_active or db_user.is_deleted:
        return None
      return db_user

    app_instance.dependency_overrides[get_current_user] = override_current_user
    app_instance.dependency_overrides[get_current_user_optional] = override_current_user_optional
    
  return TestClient(app_instance)


def test_admin_rbac_protection() -> None:
  """Kiểm tra phân quyền: User thường gọi API Admin bị từ chối 403, Admin gọi thành công."""
  with build_test_session() as db:
    normal_user = seed_user(db, "normal@example.com", role=UserRole.USER)
    admin_user = seed_user(db, "admin@example.com", role=UserRole.ADMIN)

    # 1. User thường gọi API GET /admin/users
    client = build_client(db, current_user=normal_user)
    response = client.get("/api/admin/users")
    assert response.status_code == 403
    assert response.json()["detail"] == "Bạn không có quyền thực hiện hành động này"

    # 2. Admin gọi API GET /admin/users
    client = build_client(db, current_user=admin_user)
    response = client.get("/api/admin/users")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] > 0


def test_admin_list_users_filters() -> None:
  """Kiểm tra các bộ lọc (q, role, is_active) trong API lấy danh sách user của Admin."""
  with build_test_session() as db:
    admin_user = seed_user(db, "admin_list@example.com", role=UserRole.ADMIN)
    user1 = seed_user(db, "active_user@example.com", role=UserRole.USER, is_active=True)
    user2 = seed_user(db, "blocked_user@example.com", role=UserRole.USER, is_active=False)

    client = build_client(db, current_user=admin_user)

    # Lọc tài khoản đang hoạt động
    response = client.get("/api/admin/users?is_active=true")
    assert response.status_code == 200
    items = response.json()["items"]
    emails = [u["email"] for u in items]
    assert user1.email in emails
    assert user2.email not in emails

    # Lọc tài khoản bị khóa
    response = client.get("/api/admin/users?is_active=false")
    assert response.status_code == 200
    items = response.json()["items"]
    emails = [u["email"] for u in items]
    assert user2.email in emails
    assert user1.email not in emails

    # Tìm kiếm theo từ khóa
    response = client.get("/api/admin/users?q=blocked_user")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["email"] == user2.email


def test_lock_and_unlock_user_workflow() -> None:
  """Kiểm tra luồng Admin khóa và mở khóa tài khoản người dùng, chặn đăng nhập & API."""
  with build_test_session() as db:
    admin_user = seed_user(db, "admin_lock@example.com", role=UserRole.ADMIN)
    target_user = seed_user(db, "target@example.com", role=UserRole.USER, is_active=True)

    # Tạo một refresh session giả lập cho user bị tác động
    session = RefreshSession(
      user_id=target_user.id,
      refresh_token="dummy_token",
      expired_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(session)
    db.commit()

    # 1. Admin thực hiện khóa tài khoản target_user
    client = build_client(db, current_user=admin_user)
    response = client.patch(f"/api/admin/users/{target_user.id}/status", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # Kiểm tra xem session đã bị thu hồi chưa
    db.refresh(session)
    assert session.is_revoked is True

    # 2. Thử đăng nhập bằng tài khoản vừa bị khóa (chặn 403)
    client_auth = build_client(db, current_user=None)
    response = client_auth.post("/api/auth/login", json={"identifier": target_user.email, "password": "Password123"})
    assert response.status_code == 403
    assert "khóa" in response.json()["detail"]

    # 3. Thử gọi API thường khi token của user đã bị khóa (chặn 403)
    client_user = build_client(db, current_user=target_user)
    response = client_user.get("/api/auth/me")
    assert response.status_code == 403
    assert "khóa" in response.json()["detail"]

    # 4. Admin mở khóa tài khoản
    client = build_client(db, current_user=admin_user)
    response = client.patch(f"/api/admin/users/{target_user.id}/status", json={"is_active": True})
    assert response.status_code == 200
    assert response.json()["is_active"] is True

    # 5. Đăng nhập lại bình thường sau khi được mở khóa
    client_auth = build_client(db, current_user=None)
    response = client_auth.post("/api/auth/login", json={"identifier": target_user.email, "password": "Password123"})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == target_user.email


def test_admin_moderation_post_reports() -> None:
  """Kiểm tra các hành động kiểm duyệt: Lấy danh sách báo cáo vi phạm, xóa bài viết và bỏ qua báo cáo."""
  with build_test_session() as db:
    admin_user = seed_user(db, "admin_mod@example.com", role=UserRole.ADMIN)
    author_user = seed_user(db, "author@example.com")
    reporter_user = seed_user(db, "reporter@example.com")

    # Tạo một bài viết mới
    post = Post(author_id=author_user.id, content="Nội dung vi phạm tiêu chuẩn cộng đồng", reported_count=1)
    db.add(post)
    db.commit()
    db.refresh(post)

    # Tạo một báo cáo vi phạm
    report = PostReport(post_id=post.id, user_id=reporter_user.id, reason="Nội dung phản cảm")
    db.add(report)
    db.commit()

    client = build_client(db, current_user=admin_user)

    # 1. Lấy danh sách bài viết bị báo cáo vi phạm
    response = client.get("/api/admin/reports")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    item = data["items"][0]
    assert str(item["post_id"]) == str(post.id)
    assert item["reporter"]["id"] == reporter_user.id
    assert item["post"]["content"] == post.content

    # 2. Xóa bài viết vi phạm (Soft Delete)
    response = client.delete(f"/api/admin/posts/{post.id}")
    assert response.status_code == 204

    db.refresh(post)
    assert post.is_deleted is True

    # 3. Tạo bài viết thứ hai để test Bỏ qua báo cáo (Dismiss)
    post2 = Post(author_id=author_user.id, content="Nội dung hợp lệ bị báo cáo nhầm", reported_count=1)
    db.add(post2)
    db.commit()
    db.refresh(post2)

    report2 = PostReport(post_id=post2.id, user_id=reporter_user.id, reason="Spam")
    db.add(report2)
    db.commit()

    # Admin bỏ qua báo cáo vi phạm
    response = client.delete(f"/api/admin/reports/{post2.id}")
    assert response.status_code == 204

    db.refresh(post2)
    assert post2.reported_count == 0
    assert post2.is_deleted is False

    # Kiểm tra xem bản ghi báo cáo PostReport đã bị xóa khỏi cơ sở dữ liệu chưa
    db_report = db.query(PostReport).filter(PostReport.post_id == post2.id).first()
    assert db_report is None
