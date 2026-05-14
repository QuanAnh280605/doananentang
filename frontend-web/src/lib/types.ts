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
  reaction_counts?: Record<string, number>;
  user_reaction?: string | null;
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

export type PostLiker = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
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

export type StoryAuthor = {
  id: string | number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export type Story = {
  id: string | number;
  user_id: string | number;
  file_url: string;
  caption: string | null;
  type: 'image' | 'video' | 'audio';
  visibility: 'public' | 'followersonly' | 'custom' | 'onlyme';
  expired_at: string;
  created_at: string;
  view_count: number;
  is_viewed: boolean;
  author: StoryAuthor;
};

export type StoryCreatePayload = {
  file_url: string;
  caption?: string | null;
  type?: 'image';
  visibility?: 'public' | 'followersonly' | 'custom' | 'onlyme';
};

export type StoryViewStatus = {
  story_id: string | number;
  viewed: boolean;
  view_count: number;
};
