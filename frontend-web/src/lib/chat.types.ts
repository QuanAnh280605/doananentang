import type { SearchUser } from '@/lib/auth';

export type ChatProfileStat = {
  label: string;
  value: string;
};

export type InboxThreadData = {
  id: string;
  chatId: string | null;
  user: SearchUser;
  preview: string;
  time: string;
  unread?: number;
  activityLabel: string;
  profileStats: ChatProfileStat[];
  updatedAt?: string;
};

export type DirectChat = {
  id: string;
  participantUserId: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  body: string;
  time: string;
  incoming?: boolean;
  pending?: boolean;
  senderUserId: number | null;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

export type CreateDirectChatRequest = {
  target_user_id: number;
};

export type SendChatMessageRequest = {
  content?: string | null;
  media_url?: string | null;
};

export type DirectChatResponse = {
  chat_id: number;
  participant_user_id: number;
  created_at: string;
};

export type ChatMessageResponse = {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
};

export type PaginatedChatMessagesResponse = {
  items: ChatMessageResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PaginatedDirectChatsResponse = {
  items: DirectChatListItemResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type DirectChatListItemResponse = {
  chat_id: number;
  participant: SearchUser;
  latest_message: ChatMessageResponse | null;
  updated_at: string;
  unread_count: number;
};

export type ChatReadStatusResponse = {
  chat_id: number;
  unread_count: number;
};
