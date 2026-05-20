from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.core.database import get_db
from app.crud.admin import set_user_status, get_post_reports, update_post_report_status
from app.crud.user import list_users
from app.schemas.user import UserRead
from app.schemas.admin import UserStatusUpdate, ReportStatusUpdate, PostReportRead
from app.models.db_enums import ReportStatus
from app.models.user import User

router = APIRouter(dependencies=[Depends(get_current_admin_user)])


@router.get('/users', response_model=list[UserRead])
def get_users_admin(db: Session = Depends(get_db)) -> list[UserRead]:
  # Re-using list_users from user.py but we can access it through admin
  users = list_users(db)
  return [UserRead.model_validate(user) for user in users]


@router.patch('/users/{user_id}/status', response_model=UserRead)
def update_user_status(
  user_id: int,
  payload: UserStatusUpdate,
  db: Session = Depends(get_db)
) -> UserRead:
  user = set_user_status(db, user_id, payload.is_active)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  return UserRead.model_validate(user)


@router.get('/reports/posts', response_model=dict)
def get_reports_admin(
  status: ReportStatus | None = None,
  page: int = Query(1, ge=1),
  page_size: int = Query(20, ge=1, le=50),
  db: Session = Depends(get_db)
) -> dict:
  skip = (page - 1) * page_size
  reports, total = get_post_reports(db, status=status, skip=skip, limit=page_size)
  
  items = []
  for rep in reports:
    # Need to load reporter
    reporter = db.scalar(select(User).where(User.id == rep.user_id))
    # We create a dict for Pydantic
    items.append({
      "post_id": rep.post_id,
      "user_id": rep.user_id,
      "reason": rep.reason,
      "status": rep.status,
      "created_at": rep.created_at,
      "reporter": reporter
    })
    
  return {
    "items": items,
    "total": total,
    "page": page,
    "page_size": page_size
  }


@router.patch('/reports/posts/{post_id}/{reporter_id}/status', response_model=dict)
def update_report_status(
  post_id: int,
  reporter_id: int,
  payload: ReportStatusUpdate,
  db: Session = Depends(get_db)
) -> dict:
  report = update_post_report_status(db, post_id, reporter_id, payload.status)
  if not report:
    raise HTTPException(status_code=404, detail="Report not found")
  return {"message": "Status updated successfully"}
