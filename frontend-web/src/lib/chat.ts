import type {
  ChatMessage,
  ChatMessageResponse,
  DirectChat,
  DirectChatListItemResponse,
  DirectChatResponse,
  InboxThreadData,
} from './chat.types';

const participantUserIdByChatId = new Map<string, number>();

const directChatProfileStats: InboxThreadData['profileStats'] = [
  { label: 'Source', value: 'Direct chat' },
  { label: 'Access', value: 'Followed user' },
  { label: 'Conversation', value: 'Backend sync' },
  { label: 'State', value: 'Live API thread' },
];

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatThreadTimeLabel(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return formatTimeLabel(date);
}

function formatThreadActivityLabel(dateString: string): string {
  const time = formatThreadTimeLabel(dateString);
  return time ? `Updated ${time}` : 'Updated recently';
}

function normalizeChatId(chatId: number | string): string {
  return String(chatId);
}

function trackParticipant(chatId: string, participantUserId: number): void {
  participantUserIdByChatId.set(chatId, participantUserId);
}

function mapDirectChatResponse(chat: DirectChatResponse): DirectChat {
  const nextChat: DirectChat = {
    id: normalizeChatId(chat.chat_id),
    participantUserId: chat.participant_user_id,
    createdAt: chat.created_at,
    updatedAt: chat.created_at,
  };

  trackParticipant(nextChat.id, nextChat.participantUserId);
  return nextChat;
}

function mapChatMessageResponse(message: ChatMessageResponse, participantUserId: number | null): ChatMessage {
  return {
    id: String(message.id),
    chatId: normalizeChatId(message.chat_id),
    body: message.content?.trim() || '',
    time: formatTimeLabel(new Date(message.created_at)),
    incoming: participantUserId === null ? false : message.sender_id === participantUserId,
    senderUserId: message.sender_id,
    createdAt: message.created_at,
  };
}

function mapDirectChatListItemToThread(item: DirectChatListItemResponse): InboxThreadData {
  const chatId = normalizeChatId(item.chat_id);
  trackParticipant(chatId, item.participant.id);

  return {
    id: `chat-${chatId}`,
    chatId,
    user: item.participant,
    preview: item.latest_message?.content?.trim() || item.participant.bio?.trim() || 'Bắt đầu cuộc trò chuyện mới.',
    time: formatThreadTimeLabel(item.updated_at),
    activityLabel: formatThreadActivityLabel(item.updated_at),
    profileStats: directChatProfileStats,
    updatedAt: item.updated_at,
  };
}

export function normalizeMessageContent(content: string): string {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }

  return normalizedContent;
}

export function createSingleFlightMessageSender<TArgs extends unknown[], TResult>(
  send: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  let inFlightPromise: Promise<TResult> | null = null;

  return (...args: TArgs) => {
    if (inFlightPromise) {
      return inFlightPromise;
    }

    inFlightPromise = send(...args).finally(() => {
      inFlightPromise = null;
    });

    return inFlightPromise;
  };
}

export function replaceOptimisticMessage<TMessage extends { id: string }>(
  messages: readonly TMessage[],
  optimisticId: string,
  serverMessage: TMessage,
): TMessage[] {
  return messages.map((message) => (message.id === optimisticId ? serverMessage : message));
}

export function applyMessagePreviewToThreads<TThread extends {
  chatId: string | null;
  preview: string;
  time: string;
  activityLabel: string;
}>(threads: readonly TThread[], message: Pick<ChatMessage, 'chatId' | 'body' | 'time'>): TThread[] {
  return threads.map((thread) => {
    if (thread.chatId !== message.chatId) {
      return thread;
    }

    return {
      ...thread,
      preview: message.body,
      time: message.time,
      activityLabel: `Updated ${message.time}`,
    };
  });
}

type RunOptimisticMessageSendOptions = {
  chatId: string;
  content: string;
  currentMessages: readonly ChatMessage[];
  optimisticMessage?: ChatMessage;
  buildOptimisticMessage?: (chatId: string, body: string) => ChatMessage;
  send: (chatId: string, content: string) => Promise<ChatMessage>;
  reloadMessages: (chatId: string) => Promise<ChatMessage[]>;
  onOptimisticApplied?: (messages: ChatMessage[]) => void;
  onServerApplied?: (messages: ChatMessage[]) => void;
};

export async function runOptimisticMessageSend({
  chatId,
  content,
  currentMessages,
  optimisticMessage,
  buildOptimisticMessage,
  send,
  reloadMessages,
  onOptimisticApplied,
  onServerApplied,
}: RunOptimisticMessageSendOptions): Promise<{
  normalizedContent: string;
  optimisticMessage: ChatMessage;
  optimisticMessages: ChatMessage[];
  replacedMessages: ChatMessage[];
  finalMessages: ChatMessage[];
  serverMessage: ChatMessage;
}> {
  const normalizedContent = normalizeMessageContent(content);
  const nextOptimisticMessage = optimisticMessage ?? buildOptimisticMessage?.(chatId, normalizedContent);

  if (!nextOptimisticMessage) {
    throw new Error('Thiếu optimistic message để xử lý luồng gửi tin nhắn.');
  }

  const optimisticMessages = [...currentMessages, nextOptimisticMessage];
  onOptimisticApplied?.(optimisticMessages);

  const serverMessage = await send(chatId, normalizedContent);
  const replacedMessages = replaceOptimisticMessage(optimisticMessages, nextOptimisticMessage.id, serverMessage);
  onServerApplied?.(replacedMessages);
  const finalMessages = await reloadMessages(chatId);

  return {
    normalizedContent,
    optimisticMessage: nextOptimisticMessage,
    optimisticMessages,
    replacedMessages,
    finalMessages,
    serverMessage,
  };
}

export async function listDirectChats(): Promise<InboxThreadData[]> {
  const { fetchDirectChats } = await import('./api');
  const chats = await fetchDirectChats();
  return chats.map(mapDirectChatListItemToThread);
}

export async function getOrCreateDirectChat(targetUserId: number): Promise<DirectChat> {
  const { createDirectChat } = await import('./api');
  const chat = await createDirectChat({ target_user_id: targetUserId });
  return mapDirectChatResponse(chat);
}

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  const { fetchChatMessages } = await import('./api');
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  const messages = await fetchChatMessages(chatId);
  return messages.map((message) => mapChatMessageResponse(message, participantUserId));
}

export async function sendMessage(chatId: string, content: string): Promise<ChatMessage> {
  const { createChatMessage } = await import('./api');
  const normalizedContent = normalizeMessageContent(content);
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  const message = await createChatMessage(chatId, { content: normalizedContent });
  return mapChatMessageResponse(message, participantUserId);
}
