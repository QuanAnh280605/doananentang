from datetime import datetime, timezone
import hmac
import logging
from uuid import uuid4

import jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
  create_access_token,
  create_refresh_token,
  create_reset_token,
  decode_refresh_token,
  decode_reset_token,
  hash_password,
  verify_password,
)
from app.crud.auth import create_user_from_register, get_authenticated_user, get_user_for_token
from app.crud.refresh_session import (
  create_refresh_session,
  delete_expired_refresh_sessions,
  get_refresh_session_by_refresh_token,
  revoke_refresh_session,
)
from app.crud.user import create_user, get_user_by_email, get_user_by_phone
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest
from app.schemas.user import UserRead
from app.services.email import send_email

router = APIRouter()
logger = logging.getLogger(__name__)


def _raise_for_duplicates(db: Session, *, email: str | None, phone: str | None) -> None:
  if email is not None and get_user_by_email(db, email) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists')
  if phone is not None and get_user_by_phone(db, phone) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Phone already exists')


def _raise_invalid_credentials() -> HTTPException:
  return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')


def _build_auth_response(db: Session, user: User) -> AuthResponse:
  delete_expired_refresh_sessions(db)
  token_id = str(uuid4())
  refresh_token = create_refresh_token(str(user.id), token_id)
  refresh_payload = decode_refresh_token(refresh_token)
  create_refresh_session(
    db,
    user_id=user.id,
    refresh_token=refresh_token,
    expires_at=datetime.fromtimestamp(refresh_payload['exp'], tz=timezone.utc),
  )
  return AuthResponse(
    access_token=create_access_token(str(user.id)),
    refresh_token=refresh_token,
    user=UserRead.model_validate(user),
  )


def _create_validation_exception(detail: str) -> HTTPException:
  return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def _create_conflict_exception(db: Session, *, email: str | None, phone: str | None) -> HTTPException:
  if email is not None and get_user_by_email(db, email) is not None:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists')
  if phone is not None and get_user_by_phone(db, phone) is not None:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Phone already exists')
  return HTTPException(status_code=status.HTTP_409_CONFLICT, detail='User already exists')


@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
  try:
    user_payload = create_user_from_register(db, payload)
  except ValueError as error:
    raise _create_validation_exception(str(error)) from error

  _raise_for_duplicates(db, email=str(user_payload.email) if user_payload.email is not None else None, phone=user_payload.phone)
  try:
    user = create_user(db, user_payload)
  except IntegrityError as error:
    raise _create_conflict_exception(
      db,
      email=str(user_payload.email) if user_payload.email is not None else None,
      phone=user_payload.phone,
    ) from error
  return _build_auth_response(db, user)


@router.post('/login', response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
  try:
    user = get_authenticated_user(db, payload)
  except ValueError as error:
    raise _create_validation_exception(str(error)) from error

  if user is None or not verify_password(payload.password, user.hashed_password):
    raise _raise_invalid_credentials()
  return _build_auth_response(db, user)


@router.post('/refresh', response_model=AuthResponse)
def refresh_tokens(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> AuthResponse:
  try:
    token_payload = decode_refresh_token(payload.refresh_token)
    token_id = str(token_payload['jti'])
    subject = str(token_payload['sub'])
  except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
    raise _raise_invalid_credentials()

  session = get_refresh_session_by_refresh_token(db, payload.refresh_token)
  if session is None or not hmac.compare_digest(session.refresh_token, payload.refresh_token):
    raise _raise_invalid_credentials()

  if not revoke_refresh_session(db, payload.refresh_token, commit=False):
    db.rollback()
    raise _raise_invalid_credentials()

  user = get_user_for_token(db, subject)
  if user is None:
    db.rollback()
    raise _raise_invalid_credentials()

  new_token_id = str(uuid4())
  refresh_token = create_refresh_token(str(user.id), new_token_id)
  refresh_payload = decode_refresh_token(refresh_token)
  create_refresh_session(
    db,
    user_id=user.id,
    refresh_token=refresh_token,
    expires_at=datetime.fromtimestamp(refresh_payload['exp'], tz=timezone.utc),
    commit=False,
  )
  db.commit()

  return AuthResponse(
    access_token=create_access_token(str(user.id)),
    refresh_token=refresh_token,
    user=UserRead.model_validate(user),
  )


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> None:
  try:
    token_payload = decode_refresh_token(payload.refresh_token)
    token_id = str(token_payload['jti'])
  except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
    raise _raise_invalid_credentials()

  session = get_refresh_session_by_refresh_token(db, payload.refresh_token)
  if session is None or not hmac.compare_digest(session.refresh_token, payload.refresh_token):
    raise _raise_invalid_credentials()
  if not revoke_refresh_session(db, payload.refresh_token):
    raise _raise_invalid_credentials()
  return None


@router.get('/me', response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
  return UserRead.model_validate(current_user)


@router.post("/forgot-password")
async def forgot_password(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, email)
    except ValueError as error:
        raise _create_validation_exception(str(error)) from error
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    token = create_reset_token(email)
    settings = get_settings()
    reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"

    html_body = f"""
        <h2>Reset Password</h2>
        <p>Click on the link below to reset your password:</p>
        <a href="{reset_link}">{reset_link}</a>
        <p>Link will expire in 30 minutes.</p>
    """

    background_tasks.add_task(
        send_email,
        recipients=[email],
        subject="Reset Password",
        body=html_body,
    )
    return {"message": "Check your email"}

@router.post("/reset-password")
def reset_password(token: str, password: str, db: Session = Depends(get_db)):
    try:
        payload = decode_reset_token(token)
        email = payload["sub"]
    except jwt.InvalidTokenError as error:
        logger.warning('Rejected invalid or expired reset password token')
        raise _create_validation_exception('Your reset password link is invalid or has expired') from error
    except (ValueError, KeyError) as error:
        raise _create_validation_exception(str(error)) from error
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    user.hashed_password = hash_password(password)
    db.commit()
    return {"message": "Password reset successfully"}
