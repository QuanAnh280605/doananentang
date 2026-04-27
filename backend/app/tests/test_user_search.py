from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.crud.user import search_users
from app.models.user import User


def seed_users(db: Session) -> None:
  db.add_all(
    [
      User(
        email='lena@example.com',
        password_hash='hash',
        first_name='Lena',
        last_name='Evere',
        gender='female',
        bio='Design lead',
      ),
      User(
        email='aya@example.com',
        password_hash='hash',
        first_name='Aya',
        last_name='Tran',
        gender='female',
      ),
      User(
        email='rafi@example.com',
        password_hash='hash',
        first_name='Rafi',
        last_name='Mercer',
        gender='male',
      ),
    ]
  )
  db.commit()


def build_test_session() -> Session:
  engine = create_engine('sqlite+pysqlite:///:memory:', future=True)
  User.__table__.create(bind=engine)
  return Session(bind=engine)


def test_search_users_matches_first_last_and_full_name() -> None:
  with build_test_session() as db:
    seed_users(db)

    first_name_result = search_users(db, 'len')
    assert [user.email for user in first_name_result] == ['lena@example.com']

    last_name_result = search_users(db, 'merc')
    assert [user.email for user in last_name_result] == ['rafi@example.com']

    full_name_result = search_users(db, 'aya tran')
    assert [user.email for user in full_name_result] == ['aya@example.com']


def test_search_users_returns_empty_for_blank_query() -> None:
  with build_test_session() as db:
    seed_users(db)
    assert search_users(db, '   ') == []


def test_search_users_respects_limit() -> None:
  with build_test_session() as db:
    seed_users(db)
    results = search_users(db, 'a', limit=1)
    assert len(results) == 1
