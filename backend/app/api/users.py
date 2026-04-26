from pathlib import Path
import shutil
import uuid
from fastapi import File, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.crud.user import create_user, get_user_by_email, get_user_by_id, get_user_by_phone, list_users
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.schemas.user import UserUpdate

router = APIRouter()
AVATAR_UPLOAD_DIR = Path('uploads') / 'avatars'


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
  update_data = payload.model_dump(exclude_unset=True)
  # Đảm bảo lấy user từ session hiện tại để commit có tác dụng
  db_user = db.query(User).filter(User.id == current_user.id).first()
  if not db_user:
      raise HTTPException(status_code=404, detail="User not found")
      
  print(f"DEBUG: Updating user {db_user.id} with data: {update_data}")
  for field, value in update_data.items():
    setattr(db_user, field, value)
 
  try:
    db.commit()
    db.refresh(db_user)
  except IntegrityError as error:
    db.rollback()
    raise error
 
  return UserRead.model_validate(db_user)


@router.patch('/me/avatar')
def upload_avatar(
  file: UploadFile = File(...),
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db)
):
  """Tải lên ảnh đại diện và lưu vào cơ sở dữ liệu"""
  content_type = file.content_type or ''
  if not content_type.startswith('image/'):
    raise HTTPException(status_code=400, detail='File must be an image')
  
  filename = file.filename or 'upload'
  file_ext = filename.split('.')[-1]
  new_filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_ext}"
  AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
  file_path = AVATAR_UPLOAD_DIR / new_filename
  
  with file_path.open('wb') as buffer:
    shutil.copyfileobj(file.file, buffer)
  
  # Cập nhật đường dẫn vào thư mục public local
  avatar_url = f"/static/avatars/{new_filename}"
  current_user.avatar_url = avatar_url
  db.commit()
  db.refresh(current_user)
  
  return {"message": "Tải ảnh lên thành công", "avatar_url": avatar_url}


@router.get('/{user_id}', response_model=UserRead)
def get_user_endpoint(user_id: int, db: Session = Depends(get_db)) -> UserRead:
  user = get_user_by_id(db, user_id)
  if user is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

  return UserRead.model_validate(user)
