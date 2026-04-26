export type PostAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export type PostMedia = {
  id: string;
  file_url: string;
  type: string;
  display_order: number;
};

export type Post = {
  id: string;
  author_id: string;
  content: string | null;
  visibility: string;
  reported_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  media: PostMedia[];
  author: PostAuthor;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
};

export type PaginatedPosts = {
  items: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type LikeStatus = {
  post_id: string;
  liked: boolean;
  like_count: number;
};

export type CommentAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author: CommentAuthor;
  like_count: number;
  is_liked: boolean;
  replies?: Comment[];
};
