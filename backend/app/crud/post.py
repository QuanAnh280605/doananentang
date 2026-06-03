import math
from typing import Literal

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.db_enums import MediaType, VisibilityLevel
from app.models.follow import Follow
from app.models.like import Like
from app.models.post import Post
from app.models.post_media import PostMedia
from app.models.post_viewer import PostViewer
from app.models.post_tag import PostTag
from app.schemas.post import PostCreate, PostUpdate


def get_top_reactions_for_posts(db: Session, post_ids: list[int]) -> dict[int, list[str]]:
  if not post_ids:
    return {}
    
  reaction_counts = (
    db.query(
      Like.post_id,
      Like.reaction_type,
      func.count(Like.user_id).label('reaction_count')
    )
    .filter(Like.post_id.in_(post_ids))
    .group_by(Like.post_id, Like.reaction_type)
    .subquery()
  )

  ranked_reactions = (
    db.query(
      reaction_counts.c.post_id,
      reaction_counts.c.reaction_type,
      func.row_number().over(
        partition_by=reaction_counts.c.post_id,
        order_by=reaction_counts.c.reaction_count.desc()
      ).label('rn')
    )
    .subquery()
  )

  top_reactions_query = (
    db.query(ranked_reactions.c.post_id, ranked_reactions.c.reaction_type)
    .filter(ranked_reactions.c.rn <= 3)
    .order_by(ranked_reactions.c.post_id, ranked_reactions.c.rn)
    .all()
  )

  top_reactions_map = {}
  for post_id, reaction_type in top_reactions_query:
    if post_id not in top_reactions_map:
      top_reactions_map[post_id] = []
    top_reactions_map[post_id].append(reaction_type)
      
  return top_reactions_map



def create_post(db: Session, post_in: PostCreate, author_id: int) -> Post:
  db_post = Post(
    author_id=author_id,
    content=post_in.content,
    visibility=post_in.visibility,
    feeling=post_in.feeling,
    gif_url=post_in.gif_url,
    location_name=post_in.location_name,
    location_lat=post_in.location_lat,
    location_lng=post_in.location_lng,
    shared_post_id=post_in.shared_post_id
  )
  db.add(db_post)
  db.flush()  # Lấy ID trước khi tạo media
  
  tagged_ids = set()
  if post_in.tagged_user_ids:
    tagged_ids.update(post_in.tagged_user_ids)
  if post_in.tagged_users:
    for u in post_in.tagged_users:
      if isinstance(u, dict) and 'id' in u:
        try:
          tagged_ids.add(int(u['id']))
        except (ValueError, TypeError):
          pass

  if tagged_ids:
    for tagged_id in tagged_ids:
      db_tag = PostTag(post_id=db_post.id, user_id=tagged_id)
      db.add(db_tag)

  # Nếu có mảng ảnh hoặc video được truyền lên
  if post_in.media_urls:
    for index, url in enumerate(post_in.media_urls):
      url_lower = url.lower()
      media_type = MediaType.IMAGE
      # Kiểm tra các đuôi video phổ biến (bao gồm cả query params nếu có)
      url_clean = url_lower.split('?')[0].split('#')[0]
      if any(url_clean.endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.3gpp', '.qt', '.m4v', '.ogg']):
        media_type = MediaType.VIDEO

      db_media = PostMedia(
        post_id=db_post.id,
        file_url=url,
        type=media_type,
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
    .options(
      joinedload(Post.media), 
      joinedload(Post.author),
      joinedload(Post.tagged_users).joinedload(PostTag.user),
      joinedload(Post.shared_post).joinedload(Post.author),
      joinedload(Post.shared_post).joinedload(Post.media)
    )
    .filter(Post.id == post_id, Post.is_deleted == False)
    .first()
  )
  
  if post:
    # Đếm likes và comments
    post.like_count = db.query(func.count(Like.user_id)).filter(Like.post_id == post.id).scalar() or 0
    post.comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id, Comment.is_deleted == False).scalar() or 0
    
    top_reactions_map = get_top_reactions_for_posts(db, [post.id])
    post.top_reactions = top_reactions_map.get(post.id, [])
    
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
  
  rank_expr = None

  if q is not None and q.strip():
    search_query = q.strip()
    ts_vector = func.to_tsvector('simple', func.coalesce(Post.content, ''))
    ts_query = func.plainto_tsquery('simple', search_query)
    query = query.filter(
        or_(
            ts_vector.op('@@')(ts_query),
            Post.content.ilike(f"%{search_query}%")
        )
    )
    rank_expr = func.ts_rank(ts_vector, ts_query)

  # Tính tổng số bài viết
  total = query.with_entities(func.count(Post.id)).scalar() or 0
  total_pages = math.ceil(total / page_size) if total > 0 else 1

  # Xác định cột sắp xếp
  if sort_by == 'relevance' and rank_expr is not None:
    order = (rank_expr.desc(), Post.created_at.desc())
  else:
    actual_sort_by = sort_by if sort_by != 'relevance' else 'created_at'
    sort_column = getattr(Post, actual_sort_by, Post.created_at)
    order = (sort_column.asc() if sort_order == 'asc' else sort_column.desc(),)

  # Query có eager load media + author
  items = (
    query
    .options(
      joinedload(Post.media), 
      joinedload(Post.author),
      joinedload(Post.tagged_users).joinedload(PostTag.user),
      joinedload(Post.shared_post).joinedload(Post.author),
      joinedload(Post.shared_post).joinedload(Post.media)
    )
    .order_by(*order)
    .offset((page - 1) * page_size)
    .limit(page_size)
    .all()
  )

  # Lấy stats cho từng bài viết
  post_ids = [p.id for p in items]
  top_reactions_map = get_top_reactions_for_posts(db, post_ids)
  
  for post in items:
    post.like_count = db.query(func.count(Like.user_id)).filter(Like.post_id == post.id).scalar() or 0
    post.comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id, Comment.is_deleted == False).scalar() or 0
    post.top_reactions = top_reactions_map.get(post.id, [])
    
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
  """Lấy danh sách bài viết từ người đang theo dõi (feed) có phân trang và kiểm tra quyền nhìn thấy."""

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

  posts = (
    query
    .options(
      joinedload(Post.media), 
      joinedload(Post.author),
      joinedload(Post.tagged_users).joinedload(PostTag.user),
      joinedload(Post.shared_post).joinedload(Post.author),
      joinedload(Post.shared_post).joinedload(Post.media)
    )
    .order_by(order)
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

  top_reactions_map = get_top_reactions_for_posts(db, post_ids)

  # 8. Gán stats vào từng bài
  for post in posts:
    post.like_count = like_counts.get(post.id, 0)
    post.comment_count = comment_counts.get(post.id, 0)
    post.is_liked = post.id in liked_posts
    post.user_reaction = liked_posts.get(post.id)
    post.top_reactions = top_reactions_map.get(post.id, [])

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
