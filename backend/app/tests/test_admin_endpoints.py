import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient

from app.crud.user import get_user_by_email
from app.models.db_enums import UserRole, ReportStatus
from app.models.user import User
from app.models.base import Base
from app.main import rest_app
from app.core.database import get_db

from sqlalchemy.pool import StaticPool

@pytest.fixture(scope="session")
def engine():
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    future=True,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
  )
  import app.models  # load models
  Base.metadata.create_all(bind=engine)
  return engine

@pytest.fixture
def db(engine):
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

@pytest.fixture
def client(db: Session):
  def override_get_db():
    try:
      yield db
    finally:
      pass
  rest_app.dependency_overrides[get_db] = override_get_db
  with TestClient(rest_app) as c:
    yield c
  rest_app.dependency_overrides.clear()

@pytest.fixture
def fake_user(db: Session) -> User:
  user = db.query(User).filter_by(email="admin@test.com").first()
  if not user:
    user = User(email="admin@test.com", password_hash="hash", first_name="Admin", last_name="User", role=UserRole.ADMIN, gender="custom")
    db.add(user)
    db.commit()
    db.refresh(user)
  return user

@pytest.fixture
def fake_user2(db: Session) -> User:
  user = db.query(User).filter_by(email="normal@test.com").first()
  if not user:
    user = User(email="normal@test.com", password_hash="hash", first_name="Normal", last_name="User", role=UserRole.USER, gender="male")
    db.add(user)
    db.commit()
    db.refresh(user)
  return user

@pytest.fixture
def admin_user(db: Session, fake_user: User) -> User:
  return fake_user


@pytest.fixture
def admin_token_headers(client: TestClient, admin_user: User) -> dict[str, str]:
  from app.core.security import create_access_token
  print(f"DEBUG admin_user.id: {admin_user.id}")
  token = create_access_token(str(admin_user.id))
  return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def user_token_headers(client: TestClient, fake_user2: User) -> dict[str, str]:
  from app.core.security import create_access_token
  print(f"DEBUG fake_user2.id: {fake_user2.id}")
  token = create_access_token(str(fake_user2.id))
  return {'Authorization': f'Bearer {token}'}


def test_admin_get_users_forbidden_for_normal_user(client: TestClient, user_token_headers: dict[str, str]):
  response = client.get('/api/admin/users', headers=user_token_headers)
  assert response.status_code == 403


def test_admin_get_users_success(client: TestClient, admin_token_headers: dict[str, str]):
  response = client.get('/api/admin/users', headers=admin_token_headers)
  assert response.status_code == 200
  assert isinstance(response.json(), list)


def test_admin_update_user_status(client: TestClient, admin_token_headers: dict[str, str], db: Session, fake_user2: User):
  # Normal user starts as active
  assert fake_user2.is_active is True
  
  response = client.patch(
    f'/api/admin/users/{fake_user2.id}/status',
    headers=admin_token_headers,
    json={'is_active': False}
  )
  assert response.status_code == 200
  data = response.json()
  assert data['id'] == fake_user2.id
  assert data.get('is_active', False) is False
  
  db.refresh(fake_user2)
  assert fake_user2.is_active is False

