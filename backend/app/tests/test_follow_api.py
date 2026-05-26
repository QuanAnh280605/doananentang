from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.api.router import api_router
from app.core.database import get_db
from app.models.follow import Follow
from app.models.notification import Notification
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Follow.__table__.create(bind=engine)
  Notification.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, *, email: str, first_name: str, last_name: str = 'User') -> User:
  user = User(
    email=email,
    password_hash='hash',
    first_name=first_name,
    last_name=last_name,
    gender='male',
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

  def override_current_user_optional() -> User | None:
    return current_user

  app.dependency_overrides[get_db] = override_get_db
  app.dependency_overrides[get_current_user] = override_current_user
  app.dependency_overrides[get_current_user_optional] = override_current_user_optional
  return TestClient(app)


def test_follow_user_success() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    user_b = seed_user(db, email='userb@example.com', first_name='User', last_name='B')
    client = build_client(db, user_a)

    response = client.post(f'/api/users/{user_b.id}/follow')

    assert response.status_code == 200
    data = response.json()
    assert data['user_id'] == user_b.id
    assert data['is_following'] is True
    assert data['followers_count'] == 1
    assert data['following_count'] == 0


def test_follow_self_blocked() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    client = build_client(db, user_a)

    response = client.post(f'/api/users/{user_a.id}/follow')

    assert response.status_code == 400
    assert response.json()['detail'] == 'Cannot follow yourself'


def test_follow_nonexistent_user() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    client = build_client(db, user_a)

    response = client.post('/api/users/999999/follow')

    assert response.status_code == 404
    assert response.json()['detail'] == 'User not found'


def test_follow_is_idempotent() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    user_b = seed_user(db, email='userb@example.com', first_name='User', last_name='B')
    client = build_client(db, user_a)

    # Follow lần 1
    response1 = client.post(f'/api/users/{user_b.id}/follow')
    assert response1.status_code == 200
    assert response1.json()['followers_count'] == 1

    # Follow lần 2
    response2 = client.post(f'/api/users/{user_b.id}/follow')
    assert response2.status_code == 200
    assert response2.json()['followers_count'] == 1


def test_unfollow_user_success() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    user_b = seed_user(db, email='userb@example.com', first_name='User', last_name='B')
    
    # Thiết lập mối quan hệ follow trước
    follow_rel = Follow(follower_id=user_a.id, following_id=user_b.id)
    db.add(follow_rel)
    db.commit()

    client = build_client(db, user_a)
    response = client.delete(f'/api/users/{user_b.id}/follow')

    assert response.status_code == 200
    data = response.json()
    assert data['user_id'] == user_b.id
    assert data['is_following'] is False
    assert data['followers_count'] == 0


def test_unfollow_self_blocked() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    client = build_client(db, user_a)

    response = client.delete(f'/api/users/{user_a.id}/follow')

    assert response.status_code == 400
    assert response.json()['detail'] == 'Cannot unfollow yourself'


def test_get_follow_status() -> None:
  with build_test_session() as db:
    user_a = seed_user(db, email='usera@example.com', first_name='User', last_name='A')
    user_b = seed_user(db, email='userb@example.com', first_name='User', last_name='B')
    
    client = build_client(db, user_a)
    
    # Chưa follow B
    response1 = client.get(f'/api/users/{user_b.id}/follow-status')
    assert response1.status_code == 200
    assert response1.json()['is_following'] is False
    assert response1.json()['followers_count'] == 0

    # Thiết lập follow
    follow_rel = Follow(follower_id=user_a.id, following_id=user_b.id)
    db.add(follow_rel)
    db.commit()

    # Đã follow B
    response2 = client.get(f'/api/users/{user_b.id}/follow-status')
    assert response2.status_code == 200
    assert response2.json()['is_following'] is True
    assert response2.json()['followers_count'] == 1
