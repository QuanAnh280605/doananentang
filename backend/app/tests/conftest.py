from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models.base import Base

TEST_DATABASE_URL = 'sqlite://'

engine = create_engine(
  TEST_DATABASE_URL,
  connect_args={'check_same_thread': False},
  poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(bind=engine)
  yield
  Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
  session = TestingSessionLocal()
  try:
    yield session
  finally:
    session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
  def override_get_db() -> Generator[Session, None, None]:
    yield db_session

  app.dependency_overrides[get_db] = override_get_db
  with TestClient(app) as test_client:
    yield test_client
  app.dependency_overrides.clear()
