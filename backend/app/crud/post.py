import math
from typing import Literal

from sqlalchemy import func, and_
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.db_enums import MediaType
from app.models.follow import Follow
from app.models.like import Like
from app.models.post import Post
from app.models.post_media import PostMedia
from app.models.post_viewer import PostViewer
from app.schemas.post import PostCreate, PostUpdate


def create_post(db: Session, post_in: PostCreate, author_id: int) -> Post:
  db_post = Post(
    author_id=author_id,
    content=post_in.content,
    visibility=post_in.visibility
  )
  db.add(db_post)
  db.flush()  # Lấy ID trước khi tạo media

  # Nếu có mảng ảnh được truyền lên
  if post_in.media_urls:
    for index, url in enumerate(post_in.media_urls):
      db_media = PostMedia(
        post_id=db_post.id,
        file_url=url,
        type=MediaType.IMAGE,
        display_order=index + 1
      )
      db.add(db_media)

  db.commit()
  db.refresh(db_post)
  return db_post


def get_post(db: Session, post_id: int, current_user_id: int | None = None) -> Post | None:
  """Lấy chi tiết bài viết (kèm media + tác giả + stats)"""
  post = (
    db.query(Post)
    .options(joinedload(Post.media), joinedload(Post.author))
    .filter(Post.id == post_id, Post.is_deleted == False)
    .first()
  )
  
  if post:
    # Đếm likes và comments
    post.like_count = db.query(func.count(Like.user_id)).filter(Like.post_id == post.id).scalar() or 0
    post.comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id, Comment.is_deleted == False).scalar() or 0
    
    # Kiểm tra user hiện tại đã like chưa
    if current_user_id:
      post.is_liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first() is not None
    else:
      post.is_liked = False
      
  return post


def get_posts(
  db: Session,
  *,
  page: int = 1,
  page_size: int = 10,
  sort_by: Literal['created_at', 'updated_at', 'relevance'] = 'created_at',
  sort_order: Literal['asc', 'desc'] = 'desc',
  current_user_id: int | None = None,
  author_id: int | None = None,
  q: str | None = None,
) -> dict:
  """Lấy danh sách bài viết có phân trang + sắp xếp + stats (hỗ trợ Full-Text Search)"""

  # Xây dựng query cơ bản
  query = db.query(Post).filter(Post.is_deleted == False)
  if author_id is not None:
    query = query.filter(Post.author_id == author_id)
  
  if q is not None and q.strip():
    pattern = f"%{q.strip()}%"
    query = query.filter(Post.content.ilike(pattern))

  # Tính tổng số bài viết
  total = query.with_entities(func.count(Post.id)).scalar() or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  # Xác định cột sắp xếp (bỏ relevance vì không dùng ts_rank nữa)
  sort_column = getattr(Post, sort_by if sort_by != 'relevance' else 'created_at', Post.created_at)
  order = sort_column.asc() if sort_order == 'asc' else sort_column.desc()

  # Query có eager load media + author
  items = (
    query
    .options(joinedload(Post.media), joinedload(Post.author))
    .order_by(order)
    .offset((page - 1) * page_size)
    .limit(page_size)
    .all()
  )

  # Gán stats cho từng bài viết
  for post in items:
    post.like_count = db.query(func.count(Like.user_id)).filter(Like.post_id == post.id).scalar() or 0
    post.comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id, Comment.is_deleted == False).scalar() or 0
    
    if current_user_id:
      post.is_liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first() is not None
    else:
      post.is_liked = False

  return {
    'items': items,
    'total': total,
    'page': page,
    'page_size': page_size,
    'total_pages': total_pages,
  }


def get_feed_posts(
  db: Session,
  current_user_id: int,
  page: int = 1,
  page_size: int = 10,
) -> dict:
  """Lấy danh sách bài viết từ người đang theo dõi (feed) có phân trang và kiểm tra quyền nhìn thấy."""
  
  from sqlalchemy import or_
  from app.models.db_enums import VisibilityLevel

  # Subquery lấy danh sách ID người đang theo dõi
  following_ids = db.query(Follow.following_id).filter(Follow.follower_id == current_user_id)

  # Điều kiện 1: Tác giả là người mình đang follow (hoặc chính mình)
  author_condition = or_(
    Post.author_id.in_(following_ids),
    Post.author_id == current_user_id
  )

  # Điều kiện 2: Quyền nhìn thấy
  # - PUBLIC: Ai cũng thấy
  # - FOLLOWERS_ONLY: Thấy nếu là người theo dõi hoặc chính tác giả
  # - CUSTOM: Thấy nếu có trong PostViewer hoặc là chính tác giả
  # - ONLY_ME: Chỉ chính tác giả mới thấy
  visibility_condition = or_(
    Post.visibility == VisibilityLevel.PUBLIC,
    Post.visibility == VisibilityLevel.FOLLOWERS_ONLY,
    and_(
      Post.visibility == VisibilityLevel.CUSTOM,
      Post.id.in_(db.query(PostViewer.post_id).filter(PostViewer.user_id == current_user_id))
    ),
    Post.author_id == current_user_id  # Tác giả luôn thấy bài của mình
  )

  query = db.query(Post).filter(
    Post.is_deleted == False,
    author_condition,
    visibility_condition
  )

  total = query.with_entities(func.count(Post.id)).scalar() or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  # Sắp xếp mới nhất
  order = Post.created_at.desc()

  items = (
    query
    .options(joinedload(Post.media), joinedload(Post.author))
    .order_by(order)
    .offset((page - 1) * page_size)
    .limit(page_size)
    .all()
  )

  # Tính stats cho feed
  for post in items:
    post.like_count = db.query(func.count(Like.user_id)).filter(Like.post_id == post.id).scalar() or 0
    post.comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id, Comment.is_deleted == False).scalar() or 0
    post.is_liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first() is not None

  return {
    'items': items,
    'total': total,
    'page': page,
    'page_size': page_size,
    'total_pages': total_pages,
  }


def update_post(db: Session, db_post: Post, post_in: PostUpdate) -> Post:
  update_data = post_in.model_dump(exclude_unset=True)
  for field, value in update_data.items():
    setattr(db_post, field, value)

  db.commit()
  db.refresh(db_post)
  return db_post


def delete_post(db: Session, db_post: Post) -> Post:
  db_post.is_deleted = True
  db.commit()
  db.refresh(db_post)
  return db_post
