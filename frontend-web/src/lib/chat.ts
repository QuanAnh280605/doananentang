import type {
  ChatMessage,
  ChatMessageResponse,
  DirectChat,
  DirectChatListItemResponse,
  DirectChatResponse,
  InboxThreadData,
  PaginatedChatMessagesResponse,
  PaginatedDirectChatsResponse,
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
    mediaUrl: message.media_url ?? null,
    mediaType: message.media_type ?? null,
  };
}

export function mapRealtimeMessage(message: ChatMessageResponse): ChatMessage {
  const chatId = normalizeChatId(message.chat_id);
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  return mapChatMessageResponse(message, participantUserId);
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
    unread: item.unread_count,
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

export function mergeMessagesById<TMessage extends { id: string }>(
  messages: readonly TMessage[],
  incomingMessage: TMessage,
): TMessage[] {
  const existingMessageIndex = messages.findIndex((message) => message.id === incomingMessage.id);

  if (existingMessageIndex === -1) {
    return [...messages, incomingMessage];
  }

  return messages.map((message, index) => (index === existingMessageIndex ? incomingMessage : message));
}

export function appendMessageById<TMessage extends { id: string }>(
  messages: readonly TMessage[],
  incomingMessage: TMessage,
): TMessage[] {
  const existingMessageIndex = messages.findIndex((message) => message.id === incomingMessage.id);

  if (existingMessageIndex === -1) {
    return [...messages, incomingMessage];
  }

  return messages.map((message, index) => (index === existingMessageIndex ? incomingMessage : message));
}

export function prependMessagesById<TMessage extends { id: string }>(
  messages: readonly TMessage[],
  nextMessages: readonly TMessage[],
): TMessage[] {
  const existingIds = new Set(messages.map((message) => message.id));
  return [...nextMessages.filter((message) => !existingIds.has(message.id)), ...messages];
}

export function mergeThreadsByChatId<TThread extends { id: string; chatId: string | null }>(
  preferredThreads: readonly TThread[],
  existingThreads: readonly TThread[],
): TThread[] {
  const usedThreadKeys = new Set<string>();
  const mergedThreads: TThread[] = [];

  for (const thread of [...preferredThreads, ...existingThreads]) {
    const threadKey = thread.chatId ?? thread.id;

    if (usedThreadKeys.has(threadKey)) {
      continue;
    }

    usedThreadKeys.add(threadKey);
    mergedThreads.push(thread);
  }

  return mergedThreads;
}

export function applyMessagePreviewToThreads<TThread extends {
  chatId: string | null;
  preview: string;
  time: string;
  activityLabel: string;
  unread?: number;
}>(
  threads: readonly TThread[],
  message: Pick<ChatMessage, 'chatId' | 'body' | 'time' | 'senderUserId'>,
  options?: {
    currentUserId?: number | null;
    selectedChatId?: string | null;
  },
): TThread[] {
  const shouldIncrementUnread = Boolean(
    options?.currentUserId !== null
    && options?.currentUserId !== undefined
    && message.senderUserId !== null
    && message.senderUserId !== undefined
    && message.senderUserId !== options.currentUserId
    && message.chatId !== options?.selectedChatId,
  );

  const targetIndex = threads.findIndex((t) => t.chatId === message.chatId);
  
  if (targetIndex === -1) {
    return [...threads];
  }

  const thread = threads[targetIndex];
  const updatedThread = {
    ...thread,
    preview: message.body,
    time: message.time,
    activityLabel: `Updated ${message.time}`,
    ...(shouldIncrementUnread || thread.unread !== undefined
      ? { unread: shouldIncrementUnread ? (thread.unread ?? 0) + 1 : thread.unread }
      : {}),
  };

  const nextThreads = [...threads];
  nextThreads.splice(targetIndex, 1);
  nextThreads.unshift(updatedThread);

  return nextThreads;
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

  const optimisticMessages = appendMessageById(currentMessages, nextOptimisticMessage);
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
  const response = await listDirectChatsPage();
  return response.items;
}

export async function listDirectChatsPage(page = 1, pageSize = 20): Promise<{
  items: InboxThreadData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { fetchDirectChats } = await import('./api');
  const response: PaginatedDirectChatsResponse = await fetchDirectChats(page, pageSize);

  return {
    items: response.items.map(mapDirectChatListItemToThread),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
  };
}

export async function getOrCreateDirectChat(targetUserId: number): Promise<DirectChat> {
  const { createDirectChat } = await import('./api');
  const chat = await createDirectChat({ target_user_id: targetUserId });
  return mapDirectChatResponse(chat);
}

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  const response = await listMessagesPage(chatId);
  return response.items;
}

export async function listMessagesPage(chatId: string, page = 1, pageSize = 30): Promise<{
  items: ChatMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { fetchChatMessages } = await import('./api');
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  const response: PaginatedChatMessagesResponse = await fetchChatMessages(chatId, page, pageSize);

  return {
    items: response.items.map((message) => mapChatMessageResponse(message, participantUserId)).reverse(),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
    totalPages: response.total_pages,
  };
}

export async function sendMessage(chatId: string, content: string): Promise<ChatMessage> {
  const { createChatMessage } = await import('./api');
  const normalizedContent = normalizeMessageContent(content);
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  const message = await createChatMessage(chatId, { content: normalizedContent });
  return mapChatMessageResponse(message, participantUserId);
}

export async function sendMessageWithMedia(chatId: string, mediaUrl: string, mediaType: string, content?: string): Promise<ChatMessage> {
  const { createChatMessage } = await import('./api');
  const participantUserId = participantUserIdByChatId.get(chatId) ?? null;
  const message = await createChatMessage(chatId, {
    content: content?.trim() || null,
    media_url: mediaUrl,
  });
  return mapChatMessageResponse(message, participantUserId);
}

export async function markDirectChatRead(chatId: string): Promise<void> {
  const { markChatRead } = await import('./api');
  await markChatRead(chatId);
}

export async function hasUnreadMessages(): Promise<boolean> {
  const { hasUnreadMessages } = await import('./api');
  return hasUnreadMessages();
}
