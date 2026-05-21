import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.crud.post import create_post, get_feed_posts
from app.crud.follow import create_follow
from app.schemas.post import PostCreate
from app.models.user import User
from app.models.db_enums import VisibilityLevel

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/doananentang")

@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine(DATABASE_URL)
    yield engine

@pytest.fixture
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def users(db: Session):
    user_a = User(email="usera@example.com", password_hash="hashed", first_name="User", last_name="A")
    user_b = User(email="userb@example.com", password_hash="hashed", first_name="User", last_name="B")
    user_c = User(email="userc@example.com", password_hash="hashed", first_name="User", last_name="C")
    
    db.add_all([user_a, user_b, user_c])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    db.refresh(user_c)
    
    return {"a": user_a, "b": user_b, "c": user_c}


def test_feed_user_no_follow(db: Session, users: dict):
    user_a = users["a"]
    user_b = users["b"]
    
    # B creates a post
    create_post(db, PostCreate(content="B's post", visibility=VisibilityLevel.PUBLIC), user_b.id)
    
    # A creates a post
    create_post(db, PostCreate(content="A's post", visibility=VisibilityLevel.PUBLIC), user_a.id)
    
    # User A doesn't follow anyone, feed should only contain A's post
    result = get_feed_posts(db, current_user_id=user_a.id)
    assert result['total'] == 1
    assert result['items'][0].author_id == user_a.id


def test_feed_with_following(db: Session, users: dict):
    user_a = users["a"]
    user_b = users["b"]
    user_c = users["c"]
    
    # A follows B
    create_follow(db, follower_id=user_a.id, following_id=user_b.id)
    
    # Posts
    create_post(db, PostCreate(content="B's public post", visibility=VisibilityLevel.PUBLIC), user_b.id)
    create_post(db, PostCreate(content="B's followers only post", visibility=VisibilityLevel.FOLLOWERS_ONLY), user_b.id)
    create_post(db, PostCreate(content="C's public post", visibility=VisibilityLevel.PUBLIC), user_c.id)
    
    # A views feed
    result = get_feed_posts(db, current_user_id=user_a.id)
    
    # A should see B's posts (both public and followers_only) + A's own posts (0 here)
    # A should not see C's post
    items = result['items']
    assert len(items) == 2
    
    # Sorted by newest first (created_at DESC)
    assert items[0].content == "B's followers only post"
    assert items[1].content == "B's public post"


def test_feed_pagination(db: Session, users: dict):
    user_a = users["a"]
    user_b = users["b"]
    
    # A follows B
    create_follow(db, follower_id=user_a.id, following_id=user_b.id)
    
    # B creates 5 posts
    for i in range(5):
        create_post(db, PostCreate(content=f"Post {i}", visibility=VisibilityLevel.PUBLIC), user_b.id)
        
    # Page 1, size 2
    res_page_1 = get_feed_posts(db, current_user_id=user_a.id, page=1, page_size=2)
    assert len(res_page_1['items']) == 2
    assert res_page_1['total'] == 5
    assert res_page_1['total_pages'] == 3
    
    # Page 3, size 2 (should have 1 item left)
    res_page_3 = get_feed_posts(db, current_user_id=user_a.id, page=3, page_size=2)
    assert len(res_page_3['items']) == 1

