from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.crud.user import create_user, get_user_by_email, get_user_by_id, list_users
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


@router.post('', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
  existing_user = get_user_by_email(db, payload.email)
  if existing_user is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists')

  user = create_user(db, payload)
  return UserRead.model_validate(user)


@router.get('', response_model=list[UserRead])
def list_users_endpoint(db: Session = Depends(get_db)) -> list[UserRead]:
  users = list_users(db)
  return [UserRead.model_validate(user) for user in users]


@router.get('/{user_id}', response_model=UserRead)
def get_user_endpoint(user_id: int, db: Session = Depends(get_db)) -> UserRead:
  user = get_user_by_id(db, user_id)
  if user is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

  return UserRead.model_validate(user)
