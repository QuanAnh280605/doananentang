from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.models.base import Base
from app.schemas.user import UserRead


def test_user_read_schema_excludes_hashed_password() -> None:
  payload = SimpleNamespace(
    id=1,
    email='alice@example.com',
    phone=None,
    first_name='Alice',
    last_name='Example',
    birth_date=date(2000, 1, 2),
    gender='female',
    hashed_password='hidden',
    created_at=datetime(2026, 3, 25, tzinfo=timezone.utc),
    updated_at=datetime(2026, 3, 25, tzinfo=timezone.utc),
  )

  user = UserRead.model_validate(payload)
  serialized = user.model_dump()

  assert serialized['email'] == 'alice@example.com'
  assert serialized['first_name'] == 'Alice'
  assert serialized['last_name'] == 'Example'
  assert serialized['birth_date'] == date(2000, 1, 2)
  assert serialized['gender'] == 'female'
  assert 'hashed_password' not in serialized


def test_users_table_has_auth_profile_columns() -> None:
  columns = Base.metadata.tables['users'].columns.keys()

  assert 'email' in columns
  assert 'phone' in columns
  assert 'hashed_password' in columns
  assert 'first_name' in columns
  assert 'last_name' in columns
  assert 'birth_date' in columns
  assert 'gender' in columns
  assert 'updated_at' in columns
  assert 'full_name' not in columns
