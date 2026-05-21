import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.crud.post import create_post, get_posts
from app.schemas.post import PostCreate
from app.models.user import User
from app.models.db_enums import VisibilityLevel
from app.models.base import Base

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
def test_user(db: Session):
    user = User(
        email="test_search@example.com",
        password_hash="hashed",
        first_name="Test",
        last_name="User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_post_full_text_search(db: Session, test_user: User):
    # Create test posts
    post1 = create_post(db, PostCreate(content="Học lập trình Python rất thú vị", visibility=VisibilityLevel.PUBLIC), test_user.id)
    post2 = create_post(db, PostCreate(content="PostgreSQL là hệ quản trị cơ sở dữ liệu mạnh mẽ", visibility=VisibilityLevel.PUBLIC), test_user.id)
    post3 = create_post(db, PostCreate(content="Học lập trình với PostgreSQL", visibility=VisibilityLevel.PUBLIC), test_user.id)
    
    # Search for "lập trình"
    result = get_posts(db, q="lập trình")
    assert len(result['items']) >= 2
    assert any("lập trình" in p.content.lower() for p in result['items'])
    
    # Search for "PostgreSQL"
    result = get_posts(db, q="PostgreSQL")
    assert len(result['items']) >= 2
    
    # Test relevance sorting
    result = get_posts(db, q="Học lập trình", sort_by="relevance")
    # Post 1 and 3 match both "Học" and "lập trình"
    # They should be returned
    assert len(result['items']) >= 2
    # Verify the items have the content we expect
    contents = [p.content for p in result['items']]
    assert any("Học lập trình Python" in c for c in contents)
    assert any("Học lập trình với PostgreSQL" in c for c in contents)
