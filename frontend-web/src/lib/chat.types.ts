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
};

export type CreateDirectChatRequest = {
  target_user_id: number;
};

export type SendChatMessageRequest = {
  content: string;
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
  created_at: string;
};

export type DirectChatListItemResponse = {
  chat_id: number;
  participant: SearchUser;
  latest_message: ChatMessageResponse | null;
  updated_at: string;
};
