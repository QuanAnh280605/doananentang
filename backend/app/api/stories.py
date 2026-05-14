import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.crud.story import (
  attach_story_stats,
  create_story,
  delete_story,
  get_active_stories,
  get_story,
  mark_story_viewed,
)
from app.models.db_enums import UserRole
from app.models.user import User
from app.schemas.story import StoryCreate, StoryRead, StoryViewStatus

router = APIRouter()

STORY_MEDIA_DIR = Path('uploads') / 'stories'


@router.post('/upload-media', status_code=status.HTTP_201_CREATED)
def upload_story_media(
  file: UploadFile = File(...),
  current_user: User = Depends(get_current_user),
):
  content_type = file.content_type or ''
  if not content_type.startswith('image/'):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"File '{file.filename}' không phải là ảnh hợp lệ.",
    )

  STORY_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
  file_ext = file.filename.split('.')[-1] if file.filename else 'jpg'
  unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
  file_path = STORY_MEDIA_DIR / unique_filename

  try:
    with file_path.open('wb') as buffer:
      shutil.copyfileobj(file.file, buffer)
  except IOError as error:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Lỗi lưu file: {str(error)}",
    ) from error
  finally:
    file.file.close()

  return {
    'message': 'Tải story lên thành công',
    'file_url': f"/static/stories/{unique_filename}",
  }


@router.get('', response_model=list[StoryRead])
def list_stories(
  db: Session = Depends(get_db),
  current_user: User | None = Depends(get_current_user_optional),
) -> list[StoryRead]:
  stories = get_active_stories(db, current_user_id=current_user.id if current_user else None)
  return [StoryRead.model_validate(story) for story in stories]


@router.post('', response_model=StoryRead, status_code=status.HTTP_201_CREATED)
def create_story_endpoint(
  payload: StoryCreate,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> StoryRead:
  story = create_story(db, payload, current_user.id)
  attach_story_stats(db, story, current_user.id)
  return StoryRead.model_validate(story)


@router.post('/{story_id}/views', response_model=StoryViewStatus)
def mark_story_view_endpoint(
  story_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> StoryViewStatus:
  story = get_story(db, story_id, current_user.id)
  if not story:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Story not found')

  mark_story_viewed(db, story_id, current_user.id)
  attach_story_stats(db, story, current_user.id)
  return StoryViewStatus(story_id=story_id, viewed=True, view_count=story.view_count)


@router.delete('/{story_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_story_endpoint(
  story_id: int,
  current_user: User = Depends(get_current_user),
  db: Session = Depends(get_db),
) -> None:
  story = get_story(db, story_id)
  if not story:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Story not found')

  if story.user_id != current_user.id and current_user.role != UserRole.ADMIN:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not enough permissions')

  delete_story(db, story)
