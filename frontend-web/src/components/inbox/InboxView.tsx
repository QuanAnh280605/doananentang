'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { InboxListItem } from '@/components/inbox/InboxListItem';
import { MessageBubble } from '@/components/inbox/MessageBubble';
import {
  ensureThreadStaysInInboxContext,
  resolveInboxSelectionAfterSearchClears,
  resolveInboxSelectionAfterThreadRefresh,
} from '@/components/inbox/inboxSelectionState';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { searchFollowingUsers, type SearchUser } from '@/lib/auth';
import {
  applyMessagePreviewToThreads,
  createSingleFlightMessageSender,
  getOrCreateDirectChat,
  listDirectChats,
  listMessages,
  normalizeMessageContent,
  runOptimisticMessageSend,
  sendMessage,
} from '@/lib/chat';
import type { ChatMessage, DirectChat, InboxThreadData } from '@/lib/chat.types';
import { ROUTES } from '@/lib/routes';

const surfaceClass = 'rounded-[28px] border border-[#E2E8F0] bg-white';

const followedUserProfileDetails: InboxThreadData['profileStats'] = [
  { label: 'Source', value: 'Following search' },
  { label: 'Access', value: 'Followed user only' },
  { label: 'Conversation', value: 'Direct message' },
  { label: 'State', value: 'Live backend sync' },
];

function buildInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'US';
}

function buildProfileHref(user: SearchUser, preview: string): string {
  return ROUTES.profileDetail(String(user.id), {
    name: user.full_name,
    initials: buildInitials(user.first_name, user.last_name),
    preview,
    bio: user.bio?.trim() || preview,
  });
}

function buildOptimisticMessage(chatId: string, body: string): ChatMessage {
  const createdAt = new Date();

  return {
    id: `optimistic-${createdAt.getTime()}`,
    chatId,
    body,
    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(createdAt),
    pending: true,
    senderUserId: null,
    createdAt: createdAt.toISOString(),
  };
}

function buildThreadFromFollowedUser(user: SearchUser): InboxThreadData {
  const bio = user.bio?.trim() || 'Mở nhanh từ tìm kiếm người đang theo dõi.';

  return {
    id: `followed-${user.id}`,
    chatId: null,
    user,
    preview: bio,
    time: 'Following',
    activityLabel: 'Following contact',
    profileStats: followedUserProfileDetails,
  };
}

export function InboxView() {
  const [threads, setThreads] = useState<InboxThreadData[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [threadsErrorMessage, setThreadsErrorMessage] = useState<string | null>(null);
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [matchingFollowedUsers, setMatchingFollowedUsers] = useState<SearchUser[]>([]);
  const [isSearchingFollowedUsers, setIsSearchingFollowedUsers] = useState(false);
  const [followedUsersErrorMessage, setFollowedUsersErrorMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedChat, setSelectedChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);
  const latestSearchRequestRef = useRef(0);
  const latestThreadsRequestRef = useRef(0);
  const latestMessageRequestRef = useRef(0);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendMessageGuardRef = useRef(createSingleFlightMessageSender(sendMessage));
  const normalizedInboxSearchQuery = inboxSearchQuery.trim();
  const normalizedDraftMessage = draftMessage.trim();
  const selectedUserId = selectedUser?.id ?? null;
  const followedUserThreads = matchingFollowedUsers.map(buildThreadFromFollowedUser);
  const selectedApiThread = threads.find((item) => item.user.id === selectedUser?.id) ?? null;
  const selectedFollowedThread = followedUserThreads.find((item) => item.user.id === selectedUser?.id) ?? null;
  const selectedThread = selectedApiThread ?? selectedFollowedThread ?? (selectedUser ? buildThreadFromFollowedUser(selectedUser) : null);
  const defaultVisibleThreads = selectedThread ? ensureThreadStaysInInboxContext(threads, selectedThread) : threads;
  const selectedConversation = selectedThread
    ? {
      user: selectedThread.user,
      profileHref: buildProfileHref(selectedThread.user, selectedThread.preview),
      initials: buildInitials(selectedThread.user.first_name, selectedThread.user.last_name),
      bio: selectedThread.user.bio?.trim() || selectedThread.preview,
      messages,
    }
    : null;

  const refreshThreads = useCallback(async (): Promise<InboxThreadData[]> => {
    const requestId = latestThreadsRequestRef.current + 1;
    latestThreadsRequestRef.current = requestId;
    setIsLoadingThreads(true);
    setThreadsErrorMessage(null);

    try {
      const nextThreads = await listDirectChats();

      if (latestThreadsRequestRef.current !== requestId) {
        return nextThreads;
      }

      setThreads(nextThreads);
      setSelectedUser((currentUser) => resolveInboxSelectionAfterThreadRefresh(currentUser, nextThreads));
      return nextThreads;
    } catch (error: unknown) {
      if (latestThreadsRequestRef.current !== requestId) {
        return [];
      }

      const nextMessage = error instanceof Error ? error.message : 'Không thể tải danh sách hội thoại lúc này.';
      setThreadsErrorMessage(nextMessage);
      return [];
    } finally {
      if (latestThreadsRequestRef.current === requestId) {
        setIsLoadingThreads(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshThreads();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshThreads]);

  useEffect(() => {
    if (selectedUserId === null) {
      return;
    }

    const requestId = latestMessageRequestRef.current + 1;
    latestMessageRequestRef.current = requestId;
    queueMicrotask(() => {
      if (latestMessageRequestRef.current === requestId) {
        setIsLoadingMessages(true);
        setMessageError(null);
      }
    });

    getOrCreateDirectChat(selectedUserId)
      .then(async (chat) => {
        if (latestMessageRequestRef.current !== requestId) {
          return;
        }

        setSelectedChat(chat);
        void refreshThreads();

        const existingMessages = await listMessages(chat.id);

        if (latestMessageRequestRef.current !== requestId) {
          return;
        }

        setMessages(existingMessages);
      })
      .catch((error: unknown) => {
        if (latestMessageRequestRef.current !== requestId) {
          return;
        }

        const nextMessage = error instanceof Error ? error.message : 'Không thể tải hội thoại lúc này.';
        setSelectedChat(null);
        setMessages([]);
        setMessageError(nextMessage);
      })
      .finally(() => {
        if (latestMessageRequestRef.current === requestId) {
          setIsLoadingMessages(false);
        }
      });
  }, [refreshThreads, selectedUserId]);

  const handleInboxSearchChange = (value: string) => {
    setInboxSearchQuery(value);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      setMatchingFollowedUsers([]);
      setIsSearchingFollowedUsers(false);
      setFollowedUsersErrorMessage(null);
      setSelectedUser((currentUser) => resolveInboxSelectionAfterSearchClears(currentUser));
      return;
    }

    if (trimmedValue.length < 2) {
      setMatchingFollowedUsers([]);
      setIsSearchingFollowedUsers(false);
      setFollowedUsersErrorMessage(null);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;
    setIsSearchingFollowedUsers(true);
    setFollowedUsersErrorMessage(null);

    searchTimeoutRef.current = window.setTimeout(() => {
      searchFollowingUsers(trimmedValue, 20)
        .then((users) => {
          if (latestSearchRequestRef.current === requestId) {
            setMatchingFollowedUsers(users);
          }
        })
        .catch((error: unknown) => {
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }

          const nextMessage = error instanceof Error ? error.message : 'Không thể tìm người dùng đang theo dõi lúc này.';
          setFollowedUsersErrorMessage(nextMessage);
          setMatchingFollowedUsers([]);
        })
        .finally(() => {
          if (latestSearchRequestRef.current === requestId) {
            setIsSearchingFollowedUsers(false);
          }
        });
    }, 300);
  };

  const handleSelectUser = (user: SearchUser) => {
    if (selectedUserId === user.id) {
      return;
    }

    setIsLoadingMessages(true);
    setMessageError(null);
    setSelectedChat(null);
    setMessages([]);
    setSelectedUser(user);
  };

  const handleSendMessage = async () => {
    if (!selectedChat || isSendingMessage) {
      return;
    }

    let normalizedContent: string;

    try {
      normalizedContent = normalizeMessageContent(draftMessage);
    } catch (error: unknown) {
      setMessageError(error instanceof Error ? error.message : 'Không thể gửi tin nhắn lúc này.');
      return;
    }

    const optimisticMessage = buildOptimisticMessage(selectedChat.id, normalizedContent);

    setDraftMessage('');
    if (composerTextareaRef.current) {
      composerTextareaRef.current.style.height = '40px';
    }
    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const workflowResult = await runOptimisticMessageSend({
        chatId: selectedChat.id,
        content: normalizedContent,
        currentMessages: messages,
        optimisticMessage,
        send: sendMessageGuardRef.current,
        reloadMessages: listMessages,
        onOptimisticApplied: setMessages,
        onServerApplied: setMessages,
      });

      setMessages(workflowResult.finalMessages);
      setThreads((currentThreads) => applyMessagePreviewToThreads(currentThreads, workflowResult.serverMessage));
      await refreshThreads();
    } catch (error: unknown) {
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== optimisticMessage.id));
      setDraftMessage(normalizedContent);
      setMessageError(error instanceof Error ? error.message : 'Không thể gửi tin nhắn lúc này.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderThreadButton = (item: InboxThreadData) => (
    <InboxListItem
      key={item.id}
      item={{
        id: item.id,
        name: item.user.full_name,
        preview: item.preview,
        time: item.time,
        initials: buildInitials(item.user.first_name, item.user.last_name),
        bio: item.user.bio?.trim() || item.preview,
        unread: item.unread,
        active: item.user.id === selectedConversation?.user.id,
      }}
      onClick={() => handleSelectUser(item.user)}
    />
  );

  return (
    <ProtectedPage>
      <main className="min-h-[100dvh] bg-[#F8FAFC] xl:h-[100dvh] xl:overflow-hidden">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1720px] flex-col px-4 pb-4 pt-4 md:px-6 xl:h-full xl:min-h-0">
          <AppTopNav searchPlaceholder="Search people, notes, or screenshots" />
          <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:h-[calc(100dvh-112px)] xl:grid-cols-[336px_minmax(0,1fr)_248px]">
            <section className={`${surfaceClass} min-h-0 overflow-hidden p-5`}>
              <ThemedText as="h1" className="text-[24px] font-semibold text-slate-950">Inbox</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">Priority threads and recent updates</ThemedText>
              <SearchInput className="mt-5" onChange={handleInboxSearchChange} placeholder="Search followed users" value={inboxSearchQuery} />
              <div className="mt-4 max-h-[calc(100dvh-260px)] space-y-3 overflow-y-auto pr-1 xl:max-h-none">
                {normalizedInboxSearchQuery.length === 0 ? (
                  isLoadingThreads ? (
                    <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                      Đang tải danh sách hội thoại...
                    </div>
                  ) : threadsErrorMessage && defaultVisibleThreads.length === 0 ? (
                    <div className="rounded-[22px] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                      {threadsErrorMessage}
                    </div>
                  ) : defaultVisibleThreads.length ? (
                    defaultVisibleThreads.map(renderThreadButton)
                  ) : (
                    <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                      Bạn chưa có cuộc trò chuyện nào. Hãy tìm người bạn đang theo dõi để bắt đầu.
                    </div>
                  )
                ) : normalizedInboxSearchQuery.length < 2 ? (
                  <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Nhập ít nhất 2 ký tự để tìm trong danh sách đang theo dõi.
                  </div>
                ) : isSearchingFollowedUsers ? (
                  <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Đang tìm người dùng bạn đang theo dõi...
                  </div>
                ) : followedUsersErrorMessage ? (
                  <div className="rounded-[22px] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    {followedUsersErrorMessage}
                  </div>
                ) : followedUserThreads.length ? (
                  followedUserThreads.map(renderThreadButton)
                ) : (
                  <div className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Không tìm thấy người dùng phù hợp trong danh sách bạn đang theo dõi.
                  </div>
                )}
              </div>
            </section>

            <section className={`${surfaceClass} flex min-h-0 flex-col p-5`}>
              <div className="shrink-0">
                <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Conversation</ThemedText>
                <ThemedText as="p" className="mt-1 text-sm text-slate-500">
                  {selectedThread ? `${selectedThread.user.full_name} · ${selectedThread.preview}` : 'Chọn một cuộc trò chuyện hoặc tìm người bạn đang theo dõi để bắt đầu.'}
                </ThemedText>
              </div>
              <div className="mt-4 flex shrink-0 items-center justify-between gap-3 rounded-[22px] bg-[#F8FAFC] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#DBEAFE]">
                    <span className="text-sm font-semibold tracking-[0.6px] text-slate-900">
                      {selectedConversation ? selectedConversation.initials : 'DM'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <ThemedText as="p" className="text-base font-semibold text-slate-950">
                      {selectedConversation ? selectedConversation.user.full_name : 'No conversation selected'}
                    </ThemedText>
                    <ThemedText as="p" className="truncate text-sm text-slate-500">
                      {selectedThread ? selectedThread.activityLabel : 'Follow search opens or resumes a direct chat.'}
                    </ThemedText>
                  </div>
                </div>
                {selectedConversation ? <Link className="shrink-0 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-900" href={selectedConversation.profileHref}>View profile</Link> : null}
              </div>
              <div className="mt-3 flex min-h-0 flex-1 overflow-y-auto flex-col rounded-[24px] bg-[#FCFDFE] px-4 py-4">
                {!selectedConversation ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Chọn một cuộc trò chuyện để xem tin nhắn.
                  </div>
                ) : isLoadingMessages ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Đang tải tin nhắn...
                  </div>
                ) : messageError && selectedConversation.messages.length === 0 ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    {messageError}
                  </div>
                ) : selectedConversation.messages.length ? (
                  <div className="flex min-h-full flex-col justify-end gap-3">{selectedConversation.messages.map((item) => <MessageBubble key={item.id} item={item} />)}</div>
                ) : (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Chưa có tin nhắn nào trong cuộc trò chuyện này.
                  </div>
                )}
              </div>
              <div className="mt-3 shrink-0 rounded-[24px] border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] transition-colors focus-within:border-slate-300">
                <div className="flex items-end gap-2">
                  <div className="flex shrink-0 items-center gap-1 pb-0.5 text-[#475569]">
                    <button className="h-10 w-10 rounded-full bg-slate-50 text-base transition active:scale-[0.98]" type="button">+</button>
                    <button className="h-10 w-10 rounded-full bg-slate-50 text-base transition active:scale-[0.98]" type="button">◎</button>
                    <button className="h-10 w-10 rounded-full bg-slate-50 text-base transition active:scale-[0.98]" type="button">◉</button>
                  </div>
                  <textarea className="no-focus-ring min-h-10 max-h-24 w-full resize-none overflow-y-auto rounded-[18px] bg-slate-50 px-4 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:shadow-none focus:ring-0 [box-shadow:none!important] [outline:none!important]" disabled={!selectedConversation} onChange={(event) => {
                    const textarea = event.currentTarget;
                    textarea.style.height = '40px';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
                    setDraftMessage(event.target.value);
                    if (messageError) {
                      setMessageError(null);
                    }
                  }} placeholder={selectedConversation ? 'Write a reply...' : 'Select a conversation to reply'} ref={composerTextareaRef} rows={1} value={draftMessage} />
                  <button className={`h-10 shrink-0 rounded-full px-5 text-sm font-semibold text-white transition active:scale-[0.98] ${normalizedDraftMessage.length === 0 || isSendingMessage || !selectedChat ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900'}`} disabled={normalizedDraftMessage.length === 0 || isSendingMessage || !selectedChat} onClick={handleSendMessage} type="button">
                    {isSendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
                {messageError ? <ThemedText as="p" className="mt-3 text-sm text-rose-700">{messageError}</ThemedText> : null}
              </div>
            </section>

            <section className={`${surfaceClass} min-h-0 overflow-y-auto p-5`}>
              <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Profile</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">Conversation contact</ThemedText>
              <div className="mt-5 space-y-4">
                <div className="overflow-hidden rounded-[24px] bg-[#DBEAFE]">
                  <div className="h-[120px] bg-[#BFDBFE]" />
                  <div className="px-4 pb-4">
                    <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#E2E8F0] text-sm font-semibold tracking-[0.6px] text-slate-900">{selectedConversation ? selectedConversation.initials : 'DM'}</div>
                    <ThemedText as="h3" className="mt-4 text-[24px] font-semibold text-slate-950">{selectedConversation ? selectedConversation.user.full_name : 'No profile selected'}</ThemedText>
                    <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600">{selectedConversation ? selectedConversation.bio : 'Chọn một cuộc trò chuyện để xem thêm ngữ cảnh người nhận.'}</ThemedText>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
}
