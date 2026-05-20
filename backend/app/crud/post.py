import math
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.db_enums import MediaType
from app.models.follow import Follow
from app.models.like import Like
from app.models.post import Post
from app.models.post_media import PostMedia
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
      user_like = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first()
      if user_like:
        post.is_liked = True
        post.user_reaction = user_like.reaction_type
      else:
        post.is_liked = False
        post.user_reaction = None
    else:
      post.is_liked = False
      post.user_reaction = None
      
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
      user_like = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first()
      if user_like:
        post.is_liked = True
        post.user_reaction = user_like.reaction_type
      else:
        post.is_liked = False
        post.user_reaction = None
    else:
      post.is_liked = False
      post.user_reaction = None

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
  """
  Lấy bảng tin (feed) gồm bài viết của chính mình và người đang theo dõi.
  - Sắp xếp: mới nhất trước (created_at DESC).
  - Kèm thống kê: like_count, comment_count, is_liked.
  - Dùng batch query để tránh N+1 performance issue.
  """

  # 1. Subquery: danh sách ID người đang theo dõi
  following_ids = db.query(Follow.following_id).filter(
    Follow.follower_id == current_user_id
  ).subquery()

  # 2. Query bài viết của bản thân + người đang follow, chưa bị xóa
  base_query = db.query(Post).filter(
    Post.is_deleted == False,
    (Post.author_id.in_(following_ids)) | (Post.author_id == current_user_id)
  )

  # 3. Đếm tổng số bài (cho phân trang)
  total = base_query.with_entities(func.count(Post.id)).scalar() or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  # 4. Lấy bài viết cho trang hiện tại, kèm tác giả và media (eager load)
  posts = (
    base_query
    .options(joinedload(Post.media), joinedload(Post.author))
    .order_by(Post.created_at.desc())
    .offset((page - 1) * page_size)
    .limit(page_size)
    .all()
  )

  if not posts:
    return {
      'items': [],
      'total': total,
      'page': page,
      'page_size': page_size,
      'total_pages': total_pages,
    }

  post_ids = [p.id for p in posts]

  # 5. Batch: đếm likes cho toàn bộ bài viết trong trang (1 query)
  like_counts = dict(
    db.query(Like.post_id, func.count(Like.user_id))
    .filter(Like.post_id.in_(post_ids))
    .group_by(Like.post_id)
    .all()
  )

  # 6. Batch: đếm comments cho toàn bộ bài viết trong trang (1 query)
  comment_counts = dict(
    db.query(Comment.post_id, func.count(Comment.id))
    .filter(Comment.post_id.in_(post_ids), Comment.is_deleted == False)
    .group_by(Comment.post_id)
    .all()
  )

  # 7. Batch: lấy tập post_id mà current_user đã like (1 query)
  liked_posts = {
    row.post_id: row.reaction_type for row in db.query(Like.post_id, Like.reaction_type)
    .filter(Like.post_id.in_(post_ids), Like.user_id == current_user_id)
    .all()
  }

  # 8. Gán stats vào từng bài
  for post in posts:
    post.like_count = like_counts.get(post.id, 0)
    post.comment_count = comment_counts.get(post.id, 0)
    post.is_liked = post.id in liked_posts
    post.user_reaction = liked_posts.get(post.id)

  return {
    'items': posts,
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
