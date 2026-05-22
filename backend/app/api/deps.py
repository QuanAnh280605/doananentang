from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_db
from app.core.security import decode_access_token
from app.crud.auth import get_user_for_token
from app.models.user import User
from app.models.db_enums import UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_from_access_token(db: Session, token: str) -> User | None:
  payload = decode_access_token(token)
  subject = str(payload.get('sub', ''))
  return get_user_for_token(db, subject)


def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  db: Session = Depends(get_db),
) -> User:
  if credentials is None or credentials.scheme.lower() != 'bearer':
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

  try:
    user = get_user_from_access_token(db, credentials.credentials)
  except InvalidTokenError as error:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials') from error

  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

  if not user.is_active or user.is_deleted:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Tài khoản đã bị khóa hoặc không hoạt động"
    )

  return user


def get_current_user_optional(
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
  db: Session = Depends(get_db),
) -> User | None:
  if credentials is None or credentials.scheme.lower() != 'bearer':
    return None

  try:
    user = get_user_from_access_token(db, credentials.credentials)
    if user is None or not user.is_active or user.is_deleted:
      return None
    return user
  except InvalidTokenError:
    return None


def get_current_admin(
  current_user: User = Depends(get_current_user),
) -> User:
  if current_user.role != UserRole.ADMIN:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Bạn không có quyền thực hiện hành động này"
    )
  return current_user
