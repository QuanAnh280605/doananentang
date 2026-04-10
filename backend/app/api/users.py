import os
import shutil
import uuid
from fastapi import UploadFile, File
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserUpdate
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db
from app.crud.user import create_user, get_user_by_email, get_user_by_id, get_user_by_phone, list_users
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


@router.post('', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
  if payload.email is not None and get_user_by_email(db, str(payload.email)) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists')
  if payload.phone is not None and get_user_by_phone(db, payload.phone) is not None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Phone already exists')

  try:
    user = create_user(db, payload)
  except IntegrityError as error:
    if payload.email is not None and get_user_by_email(db, str(payload.email)) is not None:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Email already exists') from error
    if payload.phone is not None and get_user_by_phone(db, payload.phone) is not None:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Phone already exists') from error
    raise
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

@router.get('/me', response_model=UserRead)
def get_current_user_profile(current_user: User = Depends(get_current_user)) -> UserRead:
  """Lấy thông tin của chính mình (đã đăng nhập)"""
  return UserRead.model_validate(current_user)
@router.patch('/me', response_model=UserRead)
def update_user_profile(
  payload: UserUpdate, 
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
) -> UserRead:
  """Cập nhật thông tin hồ sơ"""
  # Chỉ cập nhật các trường được gửi lên
  update_data = payload.model_dump(exclude_unset=True)
  for field, value in update_data.items():
    setattr(current_user, field, value)
    
  db.commit()
  db.refresh(current_user)
  return UserRead.model_validate(current_user)
@router.post('/me/avatar')
def upload_avatar(
  file: UploadFile = File(...),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
):
  """Tải lên ảnh đại diện và lưu vào cơ sở dữ liệu"""
  if not file.content_type.startswith("image/"):
    raise HTTPException(status_code=400, detail="File must be an image")
  
  file_ext = file.filename.split(".")[-1]
  new_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
  file_path = f"uploads/avatars/{new_filename}"
  
  with open(file_path, "wb") as buffer:
    shutil.copyfileobj(file.file, buffer)
  
  # Cập nhật đường dẫn vào thư mục public local
  avatar_url = f"/static/avatars/{new_filename}"
  current_user.avatar_url = avatar_url
  db.commit()
  db.refresh(current_user)
  
  return {"message": "Tải ảnh lên thành công", "avatar_url": avatar_url}