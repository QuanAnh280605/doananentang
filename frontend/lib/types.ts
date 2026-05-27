// Định nghĩa kiểu dữ liệu dùng chung cho toàn bộ ứng dụng
// Các type này khớp với schema backend

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type VisibilityLevel = 'public' | 'followersonly' | 'custom' | 'onlyme';

// ─── Post ────────────────────────────────────────────────────

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

export type PostTag = {
  user: PostAuthor;
};

/** Bài viết trả về từ API (kèm tác giả + media) */
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
  user_reaction?: ReactionType | null;
  top_reactions?: ReactionType[];
  feeling?: string | null;
  gif_url?: string | null;
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  tagged_users?: PostTag[];
  shared_post_id?: string | null;
  shared_post?: Post | null;
};

/** Response phân trang từ GET /api/posts */
export type PaginatedPosts = {
  items: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

/** Response phân trang cho Users */
export type PaginatedUsers<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

// ─── Like ────────────────────────────────────────────────────

export type LikeStatus = {
  post_id: string;
  liked: boolean;
  like_count: number;
  reaction_type?: ReactionType | null;
};

// ─── Comment ─────────────────────────────────────────────────

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

// ─── Notification ─────────────────────────────────────────────

export type NotificationRead = {
  id: number;
  receiver_id: number;
  actor_id: number;
  type: string; // 'follow' | 'like' | 'comment' | 'message'
  post_id: number | null;
  comment_id: number | null;
  message_id: number | null;
  related_user_id: number | null;
  target_post_id: number | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationRead[];
  unread_count: number;
};

// ─── Story ────────────────────────────────────────────────────

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

// ─── Chat / Message ──────────────────────────────────────────

export type ChatParticipant = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export type ChatMessageRead = {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

export type ChatListItemRead = {
  chat_id: number;
  participant: ChatParticipant;
  latest_message: ChatMessageRead | null;
  updated_at: string;
  unread_count: number;
};

export type PaginatedChatsResponse = {
  items: ChatListItemRead[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PaginatedMessagesResponse = {
  items: ChatMessageRead[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type DirectChatRead = {
  chat_id: number;
  participant_user_id: number;
  created_at: string;
};

export type ChatReadStatusRead = {
  chat_id: number;
  unread_count: number;
};


