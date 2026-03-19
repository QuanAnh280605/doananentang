from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.core.database import get_db

router = APIRouter(prefix='/health')


@router.get('')
def read_health() -> dict[str, str]:
  return {'status': 'ok'}


@router.get('/db')
def read_database_health(db: Session = Depends(get_db)) -> dict[str, str]:
  db.execute(text('SELECT 1'))
  return {'status': 'ok'}
