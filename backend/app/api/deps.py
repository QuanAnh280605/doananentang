from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db
from app.core.security import decode_access_token
from app.crud.auth import get_user_for_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  db: Session = Depends(get_db),
) -> User:
  if credentials is None or credentials.scheme.lower() != 'bearer':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

  try:
    payload = decode_access_token(credentials.credentials)
  except InvalidTokenError as error:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials') from error

  subject = str(payload.get('sub', ''))
  user = get_user_for_token(db, subject)
  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

  return user


def get_current_user_optional(
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  db: Session = Depends(get_db),
) -> User | None:
  if credentials is None or credentials.scheme.lower() != 'bearer':
    return None

  try:
    payload = decode_access_token(credentials.credentials)
    subject = str(payload.get('sub', ''))
    return get_user_for_token(db, subject)
  except InvalidTokenError:
    return None
