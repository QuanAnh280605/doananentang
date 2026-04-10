from app.core.database import SessionLocal
from app.crud.refresh_session import delete_expired_refresh_sessions


def main() -> None:
  with SessionLocal() as session:
    deleted_count = delete_expired_refresh_sessions(session)
  print(f'Deleted {deleted_count} expired refresh sessions')


if __name__ == '__main__':
  main()
