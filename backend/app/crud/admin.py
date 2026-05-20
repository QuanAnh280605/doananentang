from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.post_report import PostReport
from app.models.user import User
from app.models.db_enums import ReportStatus
from app.models.post import Post


def set_user_status(db: Session, user_id: int, is_active: bool) -> User | None:
  user = db.scalar(select(User).where(User.id == user_id))
  if not user:
    return None
  user.is_active = is_active
  db.commit()
  db.refresh(user)
  return user


def get_post_reports(db: Session, status: ReportStatus | None = None, skip: int = 0, limit: int = 20) -> tuple[list[PostReport], int]:
  stmt = select(PostReport)
  if status:
    stmt = stmt.where(PostReport.status == status)
  
  total = db.scalar(select(len(db.scalars(stmt).all()))) or 0
  stmt = stmt.order_by(PostReport.created_at.desc()).offset(skip).limit(limit)
  reports = db.scalars(stmt).all()
  return list(reports), total


def update_post_report_status(db: Session, post_id: int, user_id: int, status: ReportStatus) -> PostReport | None:
  report = db.scalar(select(PostReport).where(PostReport.post_id == post_id, PostReport.user_id == user_id))
  if not report:
    return None
  
  report.status = status
  
  # If resolving the report (confirming violation), delete the post
  if status == ReportStatus.RESOLVED:
    post = db.scalar(select(Post).where(Post.id == post_id))
    if post:
      db.delete(post)
  
  db.commit()
  if report in db:
    db.refresh(report)
  return report
