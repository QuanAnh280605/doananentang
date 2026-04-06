from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, create_reset_token, decode_reset_token, hash_password
from app.crud.auth import create_user_from_register, get_authenticated_user
from app.crud.user import create_user, get_user_by_email, get_user_by_phone
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.user import UserRead
from app.services.email import send_email

router = APIRouter()


def _raise_for_duplicates(db: Session, *, email: str | None, phone: str | None) -> None:
  if email is not None and get_user_by_email(db, email) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists')
  if phone is not None and get_user_by_phone(db, phone) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Phone already exists')


def _build_auth_response(user: User) -> AuthResponse:
  return AuthResponse(
    access_token=create_access_token(str(user.id)),
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
  return _build_auth_response(user)


@router.post('/login', response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
  try:
    user = get_authenticated_user(db, payload)
  except ValueError as error:
    raise _create_validation_exception(str(error)) from error

  if user is None or not verify_password(payload.password, user.hashed_password):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
  return _build_auth_response(user)


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
    except (ValueError, KeyError) as error:
        raise _create_validation_exception(str(error)) from error
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    user.hashed_password = hash_password(password)
    db.commit()
    return {"message": "Password reset successfully"}
