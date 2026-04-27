from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.crud.follow import count_followers, count_following, create_follow, delete_follow, is_following
from app.models.follow import Follow
from app.models.user import User


def build_test_session() -> Session:
  engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
  User.__table__.create(bind=engine)
  Follow.__table__.create(bind=engine)
  return Session(bind=engine)


def seed_users(db: Session) -> tuple[User, User, User]:
  first = User(email='first@example.com', password_hash='hash', first_name='First', last_name='User', gender='male')
  second = User(email='second@example.com', password_hash='hash', first_name='Second', last_name='User', gender='female')
  third = User(email='third@example.com', password_hash='hash', first_name='Third', last_name='User', gender='female')
  db.add_all([first, second, third])
  db.commit()
  db.refresh(first)
  db.refresh(second)
  db.refresh(third)
  return first, second, third


def test_create_and_delete_follow() -> None:
  with build_test_session() as db:
    first, second, _ = seed_users(db)

    assert create_follow(db, first.id, second.id) is True
    assert is_following(db, first.id, second.id) is True
    assert count_followers(db, second.id) == 1
    assert count_following(db, first.id) == 1

    assert delete_follow(db, first.id, second.id) is True
    assert is_following(db, first.id, second.id) is False
    assert count_followers(db, second.id) == 0


def test_follow_is_idempotent_and_self_follow_blocked() -> None:
  with build_test_session() as db:
    first, second, _ = seed_users(db)

    assert create_follow(db, first.id, second.id) is True
    assert create_follow(db, first.id, second.id) is True
    assert count_followers(db, second.id) == 1

    assert create_follow(db, first.id, first.id) is False


def test_delete_follow_is_idempotent() -> None:
  with build_test_session() as db:
    first, second, third = seed_users(db)

    create_follow(db, first.id, second.id)
    create_follow(db, third.id, second.id)
    assert count_followers(db, second.id) == 2

    assert delete_follow(db, first.id, second.id) is True
    assert delete_follow(db, first.id, second.id) is False
    assert count_followers(db, second.id) == 1
