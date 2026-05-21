export type NotificationType = 'like' | 'comment' | 'follow' | 'message' | 'tag';

export type NotificationItem = {
  id: number;
  receiver_id: number;
  actor_id: number;
  type: NotificationType;
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
  items: NotificationItem[];
  unread_count: number;
};
