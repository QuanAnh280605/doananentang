from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.api.router import api_router
from app.core.database import get_db
from app.models.comment import Comment
from app.models.like import Like
from app.models.notification import Notification
from app.models.post import Post
from app.models.post_media import PostMedia
from app.models.user import User
from app.models.db_enums import ReactionType


def build_test_session() -> Session:
  engine = create_engine(
    'sqlite+pysqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool,
    future=True,
  )
  User.__table__.create(bind=engine)
  Post.__table__.create(bind=engine)
  PostMedia.__table__.create(bind=engine)
  Comment.__table__.create(bind=engine)
  Like.__table__.create(bind=engine)
  Notification.__table__.create(bind=engine)
  return Session(bind=engine, expire_on_commit=False)


def seed_user(db: Session, *, email: str, first_name: str) -> User:
  user = User(
    email=email,
    password_hash='hash',
    first_name=first_name,
    last_name='User',
    gender='male',
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def seed_post(db: Session, *, author_id: int, content: str) -> Post:
  post = Post(
    author_id=author_id,
    content=content,
  )
  db.add(post)
  db.commit()
  db.refresh(post)
  return post


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


def test_like_post_success() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com', first_name='Author')
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    post = seed_post(db, author_id=author.id, content='Hello World')
    
    client = build_client(db, liker)

    # Thích bài viết với cảm xúc LIKE
    response = client.post(f'/api/posts/{post.id}/like?reaction_type=like')

    assert response.status_code == 200
    data = response.json()
    assert data['post_id'] == post.id
    assert data['liked'] is True
    assert data['like_count'] == 1


def test_like_post_idempotent() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com', first_name='Author')
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    post = seed_post(db, author_id=author.id, content='Hello World')
    
    client = build_client(db, liker)

    # Thích lần 1
    response1 = client.post(f'/api/posts/{post.id}/like?reaction_type=like')
    assert response1.status_code == 200
    assert response1.json()['like_count'] == 1

    # Thích lần 2 (thao tác lặp)
    response2 = client.post(f'/api/posts/{post.id}/like?reaction_type=like')
    assert response2.status_code == 200
    assert response2.json()['like_count'] == 1


def test_unlike_post_success() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com', first_name='Author')
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    post = seed_post(db, author_id=author.id, content='Hello World')
    
    # Thiết lập mối quan hệ like trước
    like_rel = Like(post_id=post.id, user_id=liker.id, reaction_type=ReactionType.LIKE)
    db.add(like_rel)
    db.commit()

    client = build_client(db, liker)
    response = client.delete(f'/api/posts/{post.id}/like')

    assert response.status_code == 200
    data = response.json()
    assert data['post_id'] == post.id
    assert data['liked'] is False
    assert data['like_count'] == 0


def test_unlike_post_idempotent() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com', first_name='Author')
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    post = seed_post(db, author_id=author.id, content='Hello World')
    
    # Thiết lập mối quan hệ like trước
    like_rel = Like(post_id=post.id, user_id=liker.id, reaction_type=ReactionType.LIKE)
    db.add(like_rel)
    db.commit()

    client = build_client(db, liker)
    
    # Bỏ thích lần 1
    response1 = client.delete(f'/api/posts/{post.id}/like')
    assert response1.status_code == 200
    assert response1.json()['like_count'] == 0

    # Bỏ thích lần 2 (thao tác lặp)
    response2 = client.delete(f'/api/posts/{post.id}/like')
    assert response2.status_code == 200
    assert response2.json()['like_count'] == 0


def test_like_nonexistent_post() -> None:
  with build_test_session() as db:
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    client = build_client(db, liker)

    response = client.post('/api/posts/999999/like')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Post not found'


def test_unlike_nonexistent_post() -> None:
  with build_test_session() as db:
    liker = seed_user(db, email='liker@example.com', first_name='Liker')
    client = build_client(db, liker)

    response = client.delete('/api/posts/999999/like')

    assert response.status_code == 404
    assert response.json()['detail'] == 'Post not found'


def test_get_post_likers() -> None:
  with build_test_session() as db:
    author = seed_user(db, email='author@example.com', first_name='Author')
    liker_a = seed_user(db, email='likera@example.com', first_name='LikerA')
    liker_b = seed_user(db, email='likerb@example.com', first_name='LikerB')
    post = seed_post(db, author_id=author.id, content='Hello World')
    
    # Hai người cùng thích bài viết
    db.add_all([
      Like(post_id=post.id, user_id=liker_a.id, reaction_type=ReactionType.LIKE),
      Like(post_id=post.id, user_id=liker_b.id, reaction_type=ReactionType.LOVE)
    ])
    db.commit()

    client = build_client(db, liker_a)
    response = client.get(f'/api/posts/{post.id}/likes')

    assert response.status_code == 200
    data = response.json()
    assert data['post_id'] == post.id
    assert data['like_count'] == 2
    assert len(data['users']) == 2
    
    # Kiểm tra thông tin các người thích bài viết
    names = [u['first_name'] for u in data['users']]
    assert 'LikerA' in names
    assert 'LikerB' in names
