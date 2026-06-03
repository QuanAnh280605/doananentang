'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';

import { ProtectedPage } from '@/components/app/ProtectedPage';
import { InboxListItem } from '@/components/inbox/InboxListItem';
import { MessageBubble } from '@/components/inbox/MessageBubble';
import {
  ensureThreadStaysInInboxContext,
  resolveInboxSelectionAfterSearchClears,
  resolveInboxSelectionAfterThreadRefresh,
} from '@/components/inbox/inboxSelectionState';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { useRealtimePresence } from '@/components/providers/RealtimeProvider';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { surfaceClass } from '@/components/ui/design-system';
import { API_URL, resolveAvatarUrl, uploadChatMedia } from '@/lib/api';
import { fetchCurrentUser, searchFollowingUsers, type AuthUser, type SearchUser } from '@/lib/auth';
import {
  appendMessageById,
  applyMessagePreviewToThreads,
  createGroupChat,
  createSingleFlightMessageSender,
  deleteChatConversation,
  getOrCreateDirectChat,
  isGroupChatThread,
  leaveGroupChat,
  listDirectChatsPage,
  listMessagesPage,
  markDirectChatRead,
  mapRealtimeMessage,
  mergeThreadsByChatId,
  normalizeMessageContent,
  prependMessagesById,
  runOptimisticMessageSend,
  sendMessage,
  sendMessageWithMedia,
  hasUnreadMessages,
} from '@/lib/chat';
import type { ChatMessage, ChatMessageResponse, DirectChat, InboxThreadData } from '@/lib/chat.types';
import { ROUTES } from '@/lib/routes';
import { connectAppSocket, joinChatRoom, leaveChatRoom } from '@/lib/socket';

const followedUserProfileDetails: InboxThreadData['profileStats'] = [
  { label: 'Nguồn', value: 'Tìm kiếm người theo dõi' },
  { label: 'Truy cập', value: 'Chỉ người theo dõi' },
  { label: 'Hội thoại', value: 'Tin nhắn trực tiếp' },
  { label: 'Trạng thái', value: 'Đồng bộ trực tiếp' },
];

const MESSAGES_PAGE_SIZE = 30;
const THREADS_PAGE_SIZE = 20;

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

function resolveMediaSrc(url: string): string {
  if (!url) return url;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}

function isVideoMedia(mediaUrl: string | null | undefined, mediaType: string | null | undefined): boolean {
  if (!mediaUrl) return false;
  const typeLower = mediaType?.toLowerCase() || '';
  if (typeLower.includes('video')) return true;
  const urlLower = mediaUrl.toLowerCase();
  return urlLower.endsWith('.mp4') ||
    urlLower.endsWith('.webm') ||
    urlLower.endsWith('.mov') ||
    urlLower.endsWith('.avi') ||
    urlLower.endsWith('.mkv');
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
  const { isUserOnline, setHasNewMessage } = useRealtimePresence();
  const searchParams = useSearchParams();
  const queryUserId = searchParams.get('userId');
  const queryChatId = searchParams.get('chatId');

  const [threads, setThreads] = useState<InboxThreadData[]>([]);
  const [threadsPage, setThreadsPage] = useState(1);
  const [threadsTotalPages, setThreadsTotalPages] = useState(0);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMoreThreads, setIsLoadingMoreThreads] = useState(false);
  const [threadsErrorMessage, setThreadsErrorMessage] = useState<string | null>(null);
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [matchingFollowedUsers, setMatchingFollowedUsers] = useState<SearchUser[]>([]);
  const [isSearchingFollowedUsers, setIsSearchingFollowedUsers] = useState(false);
  const [followedUsersErrorMessage, setFollowedUsersErrorMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedChat, setSelectedChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotalPages, setMessagesTotalPages] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [lightboxMessage, setLightboxMessage] = useState<ChatMessage | null>(null);

  // Media upload state
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Group chat creation state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingGroupUsers, setIsSearchingGroupUsers] = useState(false);
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<number[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Chat menu state
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'leave' | 'delete';
    chatId: string;
    title: string;
    description: string;
    confirmLabel: string;
    isLoading: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const latestSearchRequestRef = useRef(0);
  const latestThreadsRequestRef = useRef(0);
  const latestMessageRequestRef = useRef(0);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToLatestRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const sendMessageGuardRef = useRef(createSingleFlightMessageSender(sendMessage));
  const selectedChatIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const normalizedInboxSearchQuery = inboxSearchQuery.trim();
  const normalizedDraftMessage = draftMessage.trim();
  const selectedUserId = selectedUser?.id ?? null;
  const followedUserThreads = matchingFollowedUsers.map(buildThreadFromFollowedUser);
  const selectedApiThread = threads.find((item) => item.user?.id === selectedUser?.id) ?? null;
  const selectedFollowedThread = followedUserThreads.find((item) => item.user?.id === selectedUser?.id) ?? null;
  const selectedThread = selectedApiThread ?? selectedFollowedThread ?? (selectedUser ? buildThreadFromFollowedUser(selectedUser) : null);
  const defaultVisibleThreads = selectedThread ? ensureThreadStaysInInboxContext(threads, selectedThread) : threads;
  const selectedConversation = selectedThread && selectedThread.user
    ? {
      user: selectedThread.user,
      profileHref: buildProfileHref(selectedThread.user, selectedThread.preview),
      initials: buildInitials(selectedThread.user.first_name, selectedThread.user.last_name),
      bio: selectedThread.user.bio?.trim() || selectedThread.preview,
      messages,
    }
    : null;

  const refreshThreads = useCallback(async (options?: {
    preserveLoadedPages?: boolean;
    silent?: boolean;
  }): Promise<InboxThreadData[]> => {
    const isSilentRefresh = Boolean(options?.silent);
    const requestId = latestThreadsRequestRef.current + 1;

    if (!isSilentRefresh) {
      latestThreadsRequestRef.current = requestId;
    }

    if (!isSilentRefresh) {
      setIsLoadingThreads(true);
    }
    setThreadsErrorMessage(null);

    try {
      const response = await listDirectChatsPage(1, THREADS_PAGE_SIZE);
      const nextThreads = response.items;

      if (!isSilentRefresh && latestThreadsRequestRef.current !== requestId) {
        return nextThreads;
      }

      setThreads((currentThreads) => (
        options?.preserveLoadedPages ? mergeThreadsByChatId(nextThreads, currentThreads) : nextThreads
      ));
      setThreadsPage((currentPage) => (options?.preserveLoadedPages ? Math.max(currentPage, response.page) : response.page));
      setThreadsTotalPages(response.totalPages);

      if (!options?.preserveLoadedPages) {
        setSelectedUser((currentUser) => resolveInboxSelectionAfterThreadRefresh(currentUser, nextThreads));
      }

      return nextThreads;
    } catch (error: unknown) {
      if (!isSilentRefresh && latestThreadsRequestRef.current !== requestId) {
        return [];
      }

      const nextMessage = error instanceof Error ? error.message : 'Không thể tải danh sách hội thoại lúc này.';
      setThreadsErrorMessage(nextMessage);
      return [];
    } finally {
      if (!isSilentRefresh && latestThreadsRequestRef.current === requestId) {
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
    let isMounted = true;

    fetchCurrentUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingThreads) return;

    if (queryUserId) {
      const uId = Number(queryUserId);
      const existingThread = threads.find((t) => t.user?.id === uId);
      if (existingThread?.user) {
        setSelectedUser(existingThread.user);
      } else {
        // Tải thông tin người dùng từ API và tự động chọn
        import('@/lib/auth').then(({ fetchUserById }) => {
          fetchUserById(uId)
            .then((user) => {
              setSelectedUser(user);
            })
            .catch((err) => {
              console.error('Failed to fetch user by ID:', err);
            });
        });
      }
    } else if (queryChatId) {
      const existingThread = threads.find((t) => t.chatId === queryChatId);
      if (existingThread) {
        if (existingThread.isGroup) {
          handleSelectGroupThread(existingThread);
        } else if (existingThread.user) {
          handleSelectUser(existingThread.user);
        }
      }
    }
  }, [queryUserId, queryChatId, threads, isLoadingThreads]);

  const clearThreadUnread = useCallback((chatId: string) => {
    setThreads((currentThreads) => currentThreads.map((thread) => (
      thread.chatId === chatId ? { ...thread, unread: 0 } : thread
    )));
  }, []);

  const scrollToBottomIfNeeded = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      shouldScrollToLatestRef.current = true;
    }
  }, []);

  useEffect(() => {
    selectedChatIdRef.current = selectedChat?.id ?? null;
  }, [selectedChat?.id]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser?.id]);

  useEffect(() => {
    const socket = connectAppSocket();

    if (!socket) {
      return;
    }

    const handleMessageCreated = (payload: ChatMessageResponse) => {
      const nextMessage = mapRealtimeMessage(payload);

      if (selectedChatIdRef.current === nextMessage.chatId) {
        scrollToBottomIfNeeded();
        setMessages((currentMessages) => appendMessageById(currentMessages, nextMessage));

        if (nextMessage.senderUserId !== null && nextMessage.senderUserId !== currentUserIdRef.current) {
          void markDirectChatRead(nextMessage.chatId)
            .then(() => {
              clearThreadUnread(nextMessage.chatId);
              hasUnreadMessages().then(setHasNewMessage).catch(() => undefined);
            })
            .catch(() => undefined);
        }
      }

      setThreads((currentThreads) => {
        const hasLocalThread = currentThreads.some((thread) => thread.chatId === nextMessage.chatId);

        if (!hasLocalThread) {
          void refreshThreads({ preserveLoadedPages: true, silent: true });
          return currentThreads;
        }

        return applyMessagePreviewToThreads(currentThreads, nextMessage, {
          currentUserId: currentUserIdRef.current,
          selectedChatId: selectedChatIdRef.current,
        });
      });
    };

    socket.on('message-created', handleMessageCreated);

    return () => {
      socket.off('message-created', handleMessageCreated);
    };
  }, [clearThreadUnread, refreshThreads, scrollToBottomIfNeeded, setHasNewMessage]);

  useEffect(() => {
    const chatId = selectedChat?.id ?? null;

    if (!chatId) {
      return;
    }

    void joinChatRoom(chatId);

    return () => {
      void leaveChatRoom(chatId);
    };
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!shouldScrollToLatestRef.current) {
      return;
    }

    const scrollElement = messagesScrollRef.current;
    if (!scrollElement) {
      return;
    }

    scrollElement.scrollTop = scrollElement.scrollHeight;
    shouldScrollToLatestRef.current = false;
  }, [messages]);

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
        void markDirectChatRead(chat.id)
          .then(() => {
            clearThreadUnread(chat.id);
            hasUnreadMessages().then(setHasNewMessage).catch(() => undefined);
            void refreshThreads();
          })
          .catch(() => {
            void refreshThreads();
          });

        const existingMessages = await listMessagesPage(chat.id, 1, MESSAGES_PAGE_SIZE);

        if (latestMessageRequestRef.current !== requestId) {
          return;
        }

        shouldScrollToLatestRef.current = true;
        setMessages(existingMessages.items);
        setMessagesPage(existingMessages.page);
        setMessagesTotalPages(existingMessages.totalPages);
      })
      .catch((error: unknown) => {
        if (latestMessageRequestRef.current !== requestId) {
          return;
        }

        const nextMessage = error instanceof Error ? error.message : 'Không thể tải hội thoại lúc này.';
        setSelectedChat(null);
        setMessages([]);
        setMessagesPage(1);
        setMessagesTotalPages(0);
        setIsLoadingMoreMessages(false);
        setMessageError(nextMessage);
      })
      .finally(() => {
        if (latestMessageRequestRef.current === requestId) {
          setIsLoadingMessages(false);
        }
      });
  }, [clearThreadUnread, refreshThreads, selectedUserId, setHasNewMessage]);

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

  const clearChatIdFromUrl = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('chatId')) {
      url.searchParams.delete('chatId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleSelectUser = (user: SearchUser) => {
    if (selectedUserId === user.id) {
      return;
    }

    clearChatIdFromUrl();
    setIsLoadingMessages(true);
    setMessageError(null);
    setSelectedChat(null);
    setMessages([]);
    setMessagesPage(1);
    setMessagesTotalPages(0);
    setIsLoadingMoreMessages(false);
    setSelectedUser(user);
  };

  const handleSelectGroupThread = (thread: InboxThreadData) => {
    if (!thread.chatId || !thread.isGroup) return;

    clearChatIdFromUrl();
    setIsLoadingMessages(true);
    setMessageError(null);
    setSelectedUser(null);
    setSelectedChat({
      id: thread.chatId,
      participantUserId: null,
      isGroup: true,
      groupName: thread.groupName ?? null,
      avatarUrl: thread.avatarUrl ?? null,
      memberCount: thread.memberCount ?? null,
      createdAt: null,
      updatedAt: null,
    });
    setMessages([]);
    setMessagesPage(1);
    setMessagesTotalPages(0);
    setIsLoadingMoreMessages(false);

    // Load messages for group chat
    listMessagesPage(thread.chatId, 1, MESSAGES_PAGE_SIZE)
      .then((response) => {
        shouldScrollToLatestRef.current = true;
        setMessages(response.items);
        setMessagesPage(response.page);
        setMessagesTotalPages(response.totalPages);
      })
      .catch((error: unknown) => {
        const nextMessage = error instanceof Error ? error.message : 'Không thể tải tin nhắn nhóm lúc này.';
        setMessageError(nextMessage);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  };

  const handleGroupSearchChange = (value: string) => {
    setGroupSearchQuery(value);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (value.trim().length < 2) {
      setGroupSearchResults([]);
      return;
    }

    setIsSearchingGroupUsers(true);
    searchTimeoutRef.current = window.setTimeout(() => {
      searchFollowingUsers(value.trim(), 20)
        .then(setGroupSearchResults)
        .catch(() => setGroupSearchResults([]))
        .finally(() => setIsSearchingGroupUsers(false));
    }, 300);
  };

  const toggleGroupUser = (userId: number) => {
    setSelectedGroupUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUserIds.length === 0) return;

    setIsCreatingGroup(true);
    try {
      const chat = await createGroupChat(groupName.trim(), selectedGroupUserIds);
      setShowCreateGroup(false);
      setGroupName('');
      setGroupSearchQuery('');
      setGroupSearchResults([]);
      setSelectedGroupUserIds([]);

      await refreshThreads();

      // Select the new group chat
      setSelectedChat(chat);
      if (chat.id) {
        listMessagesPage(chat.id, 1, MESSAGES_PAGE_SIZE)
          .then((response) => {
            shouldScrollToLatestRef.current = true;
            setMessages(response.items);
            setMessagesPage(response.page);
            setMessagesTotalPages(response.totalPages);
          })
          .catch(() => undefined)
          .finally(() => setIsLoadingMessages(false));
      }
    } catch (error: unknown) {
      setMessageError(error instanceof Error ? error.message : 'Tạo nhóm thất bại.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const requestLeaveGroup = () => {
    if (!selectedChat?.id || !selectedChat.isGroup) return;
    setShowChatMenu(false);
    setConfirmDialog({
      type: 'leave',
      chatId: selectedChat.id,
      title: 'Rời khỏi nhóm',
      description: `Bạn có chắc muốn rời nhóm "${selectedChat.groupName || 'Nhóm Trò Chuyện'}"? Bạn sẽ không nhận được tin nhắn mới từ nhóm này.`,
      confirmLabel: 'Rời nhóm',
      isLoading: false,
    });
  };

  const requestDeleteChat = () => {
    if (!selectedChat?.id) return;
    setShowChatMenu(false);
    const chatName = selectedChat.isGroup
      ? (selectedChat.groupName || 'Nhóm Trò Chuyện')
      : (selectedConversation?.user?.full_name || 'cuộc trò chuyện này');
    setConfirmDialog({
      type: 'delete',
      chatId: selectedChat.id,
      title: 'Xóa cuộc trò chuyện',
      description: `Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện với "${chatName}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      isLoading: false,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    setConfirmDialog((prev) => prev ? { ...prev, isLoading: true } : null);
    try {
      if (confirmDialog.type === 'leave') {
        await leaveGroupChat(confirmDialog.chatId);
      } else {
        await deleteChatConversation(confirmDialog.chatId);
      }
      setSelectedChat(null);
      setSelectedUser(null);
      setMessages([]);
      setConfirmDialog(null);
      await refreshThreads();
    } catch (error: unknown) {
      setMessageError(error instanceof Error ? error.message : 'Thao tác thất bại.');
      setConfirmDialog(null);
    }
  };

  const handleThreadsScroll = (event: UIEvent<HTMLDivElement>) => {
    if (
      normalizedInboxSearchQuery.length > 0
      || isLoadingThreads
      || isLoadingMoreThreads
      || threadsPage >= threadsTotalPages
    ) {
      return;
    }

    const element = event.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 120;

    if (!isNearBottom) {
      return;
    }

    const nextPage = threadsPage + 1;
    setIsLoadingMoreThreads(true);

    listDirectChatsPage(nextPage, THREADS_PAGE_SIZE)
      .then((response) => {
        setThreads((currentThreads) => mergeThreadsByChatId(currentThreads, response.items));
        setThreadsPage(response.page);
        setThreadsTotalPages(response.totalPages);
      })
      .catch((error: unknown) => {
        setThreadsErrorMessage(error instanceof Error ? error.message : 'Không thể tải thêm hội thoại lúc này.');
      })
      .finally(() => {
        setIsLoadingMoreThreads(false);
      });
  };

  const handleMessagesScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;

    if (!selectedChat || isLoadingMessages || isLoadingMoreMessages || messagesPage >= messagesTotalPages) {
      return;
    }

    const isNearTop = element.scrollTop <= 96;

    if (!isNearTop) {
      return;
    }

    const nextPage = messagesPage + 1;
    const previousScrollHeight = element.scrollHeight;
    setIsLoadingMoreMessages(true);

    listMessagesPage(selectedChat.id, nextPage, MESSAGES_PAGE_SIZE)
      .then((response) => {
        if (selectedChatIdRef.current !== selectedChat.id) {
          return;
        }

        setMessages((currentMessages) => prependMessagesById(currentMessages, response.items));
        setMessagesPage(response.page);
        setMessagesTotalPages(response.totalPages);

        requestAnimationFrame(() => {
          if (selectedChatIdRef.current === selectedChat.id) {
            element.scrollTop = element.scrollHeight - previousScrollHeight;
          }
        });
      })
      .catch((error: unknown) => {
        setMessageError(error instanceof Error ? error.message : 'Không thể tải thêm tin nhắn lúc này.');
      })
      .finally(() => {
        if (selectedChatIdRef.current === selectedChat.id) {
          setIsLoadingMoreMessages(false);
        }
      });
  };

  const handleSendMessage = async () => {
    if (!selectedChat || isSendingMessage) {
      return;
    }

    const hasText = draftMessage.trim().length > 0;
    const hasMedia = Boolean(mediaFile);

    if (!hasText && !hasMedia) return;

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      if (hasMedia && mediaFile) {
        // Upload media first
        setIsUploadingMedia(true);
        const { url: mediaUrl, media_type: mediaType } = await uploadChatMedia(mediaFile);
        setIsUploadingMedia(false);

        // Send message with media
        const serverMessage = await sendMessageWithMedia(
          selectedChat.id,
          mediaUrl,
          mediaType,
          hasText ? draftMessage : undefined,
        );

        setMessages((currentMessages) => appendMessageById(currentMessages, serverMessage));
        setThreads((currentThreads) => applyMessagePreviewToThreads(currentThreads, serverMessage, {
          currentUserId: currentUser?.id ?? null,
          selectedChatId: selectedChat.id,
        }));

        // Reset
        setDraftMessage('');
        setMediaPreview(null);
        setMediaFile(null);
        if (composerTextareaRef.current) {
          composerTextareaRef.current.style.height = '40px';
        }
        scrollToBottomIfNeeded(true);
      } else {
        // Text-only message
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

        const workflowResult = await runOptimisticMessageSend({
          chatId: selectedChat.id,
          content: normalizedContent,
          currentMessages: messages,
          optimisticMessage,
          send: sendMessageGuardRef.current,
          reloadMessages: async () => messages,
        });

        setMessages(workflowResult.replacedMessages);
        setThreads((currentThreads) => applyMessagePreviewToThreads(currentThreads, workflowResult.serverMessage, {
          currentUserId: currentUser?.id ?? null,
          selectedChatId: selectedChat.id,
        }));
        scrollToBottomIfNeeded(true);
      }
    } catch (error: unknown) {
      setIsUploadingMedia(false);
      setMessageError(error instanceof Error ? error.message : 'Không thể gửi tin nhắn lúc này.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderThreadButton = (item: InboxThreadData) => {
    const isGroup = isGroupChatThread(item);

    return (
      <InboxListItem
        key={item.id}
        item={{
          id: item.id,
          name: isGroup ? (item.groupName || 'Nhóm Trò Chuyện') : (item.user?.full_name || 'Unknown'),
          preview: item.preview,
          time: item.time,
          initials: isGroup
            ? (item.groupName || 'GP').slice(0, 2).toUpperCase()
            : buildInitials(item.user?.first_name || '', item.user?.last_name || ''),
          avatarUrl: isGroup ? item.avatarUrl : item.user?.avatar_url,
          bio: isGroup ? `${item.memberCount || '—'} thành viên` : (item.user?.bio?.trim() || item.preview),
          isOnline: !isGroup && item.user ? isUserOnline(item.user.id) : false,
          unread: item.unread,
          active: isGroup
            ? item.chatId === selectedChat?.id
            : (item.user?.id ?? null) === selectedConversation?.user?.id,
        }}
        onClick={() => {
          if (isGroup) {
            handleSelectGroupThread(item);
          } else if (item.user) {
            handleSelectUser(item.user);
          }
        }}
      />
    );
  };

  return (
    <ProtectedPage>
      <main className="min-h-[100dvh] bg-[#F8FAFC] xl:h-[100dvh] xl:overflow-hidden">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1720px] flex-col px-4 pb-4 pt-4 md:px-6 xl:h-full xl:min-h-0">
          <AppTopNav searchPlaceholder="Tìm kiếm người dùng, ghi chú..." currentUser={currentUser} hideInboxAction />
          <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:h-[calc(100dvh-112px)] xl:grid-cols-[336px_minmax(0,1fr)_248px]">
            <section className={`${surfaceClass} min-h-0 overflow-hidden p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <ThemedText as="h1" className="text-[24px] font-semibold text-slate-950">Inbox</ThemedText>
                  <ThemedText as="p" className="mt-1 text-sm text-slate-500">Priority threads and recent updates</ThemedText>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 border border-slate-200 hover:bg-[#EAF4FB] hover:border-[#4A9FD8] transition-all active:scale-95"
                  onClick={() => setShowCreateGroup(true)}
                  type="button"
                  title="Tạo nhóm chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="#4A9FD8">
                    <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.56-30,8,8,0,1,1-15.1-4A40,40,0,1,1,219,117.36a51.71,51.71,0,0,0,27.4,22.24A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,44,44,0,1,1,58.32,0A72.06,72.06,0,0,1,190.92,212ZM128,172a28,28,0,1,0-28-28A28,28,0,0,0,128,172ZM216,88a8,8,0,0,1-8,8H200v8a8,8,0,0,1-16,0V96H176a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,216,88Z" />
                  </svg>
                </button>
              </div>
              <SearchInput className="mt-5" onChange={handleInboxSearchChange} placeholder="Search followed users" value={inboxSearchQuery} />
              <div className="mt-4 max-h-[calc(100dvh-260px)] space-y-3 overflow-y-auto pr-1 xl:max-h-none" onScroll={handleThreadsScroll}>
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
                    <>
                      {defaultVisibleThreads.map(renderThreadButton)}
                      {isLoadingMoreThreads ? (
                        <div className="rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-center text-sm text-slate-500">
                          Đang tải thêm hội thoại...
                        </div>
                      ) : null}
                    </>
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
                  {selectedChat?.isGroup
                    ? `${selectedChat.groupName || 'Nhóm Trò Chuyện'} · ${selectedChat.memberCount || '—'} thành viên`
                    : selectedThread
                      ? `${selectedThread.user?.full_name || 'Unknown'} · ${selectedThread.preview}`
                      : 'Chọn một cuộc trò chuyện hoặc tìm người bạn đang theo dõi để bắt đầu.'}
                </ThemedText>
              </div>
              <div className="mt-4 flex shrink-0 items-center justify-between gap-3 rounded-[24px] border border-[#E4E8EE] bg-[#F1F5F9] px-5 py-4 shadow-[0_2px_8px_-3px_rgba(15,23,42,0.07)]">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DBEAFE]">
                    {selectedChat?.isGroup ? (
                      selectedChat.avatarUrl ? (
                        <img alt={selectedChat.groupName || 'Group'} className="h-full w-full object-cover" src={resolveAvatarUrl(selectedChat.avatarUrl) as string} />
                      ) : (
                        <span className="text-sm font-semibold tracking-[0.6px] text-slate-900">
                          {(selectedChat.groupName || 'GP').slice(0, 2).toUpperCase()}
                        </span>
                      )
                    ) : selectedConversation && resolveAvatarUrl(selectedConversation.user?.avatar_url) ? (
                      <img alt={selectedConversation.user?.full_name || ''} className="h-full w-full object-cover" src={resolveAvatarUrl(selectedConversation.user?.avatar_url) as string} />
                    ) : (
                      <span className="text-sm font-semibold tracking-[0.6px] text-slate-900">
                        {selectedConversation ? selectedConversation.initials : 'DM'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <ThemedText as="p" className="text-[17px] font-semibold leading-tight text-slate-950">
                      {selectedChat?.isGroup
                        ? (selectedChat.groupName || 'Nhóm Trò Chuyện')
                        : selectedConversation
                          ? (selectedConversation.user?.full_name || 'Unknown')
                          : 'No conversation selected'}
                    </ThemedText>
                    <ThemedText as="p" className="mt-0.5 truncate text-sm text-slate-500">
                      {selectedChat?.isGroup
                        ? `${selectedChat.memberCount || '—'} thành viên`
                        : selectedThread
                          ? selectedThread.activityLabel
                          : 'Follow search opens or resumes a direct chat.'}
                    </ThemedText>
                  </div>
                </div>
                {selectedConversation && !selectedChat?.isGroup ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link className="rounded-[18px] bg-white border border-[#E4E8EE] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" href={selectedConversation.profileHref}>View profile</Link>
                    <button
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white border border-[#E4E8EE] text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all"
                      onClick={requestDeleteChat}
                      title="Xóa cuộc trò chuyện"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
                      </svg>
                    </button>
                  </div>
                ) : selectedChat?.isGroup ? (
                  <button
                    className="shrink-0 rounded-[18px] border border-[#E4E8EE] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    type="button"
                  >
                    Tùy chọn
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex min-h-0 flex-1 overflow-y-auto flex-col rounded-[24px] bg-[#FCFDFE] px-4 py-4" onScroll={handleMessagesScroll} ref={messagesScrollRef}>
                {!selectedConversation && !selectedChat ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Chọn một cuộc trò chuyện để xem tin nhắn.
                  </div>
                ) : isLoadingMessages ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Đang tải tin nhắn...
                  </div>
                ) : messageError && messages.length === 0 ? (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-rose-50 px-4 py-4 text-sm text-rose-700">
                    {messageError}
                  </div>
                ) : messages.length ? (
                  <div className="flex min-h-full flex-col">
                    {isLoadingMoreMessages ? (
                      <div className="rounded-[18px] bg-[#F8FAFC] px-4 py-3 text-center text-sm text-slate-500">
                        Đang tải thêm tin nhắn...
                      </div>
                    ) : null}
                    <div className="mt-auto" aria-hidden="true" />
                    {(() => {
                      const lastReadMessageId = [...messages]
                        .reverse()
                        .find((msg) => !msg.incoming && msg.isRead)?.id;

                      return messages.map((item, index, allMessages) => {
                        const TIME_GAP_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
                        const currentDate = new Date(item.createdAt);
                        const previousMessage = index > 0 ? allMessages[index - 1] : null;
                        const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null;

                        const isFirstMessage = index === 0;
                        const hasLargeGap = previousDate
                          ? currentDate.getTime() - previousDate.getTime() >= TIME_GAP_THRESHOLD_MS
                          : false;
                        const showTimeSeparator = isFirstMessage || hasLargeGap;

                        let timeSeparatorLabel = '';
                        if (showTimeSeparator) {
                          const now = new Date();
                          const isToday = currentDate.toDateString() === now.toDateString();
                          const yesterday = new Date(now);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const isYesterday = currentDate.toDateString() === yesterday.toDateString();

                          const timeStr = new Intl.DateTimeFormat('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }).format(currentDate);

                          if (isToday) {
                            timeSeparatorLabel = timeStr;
                          } else if (isYesterday) {
                            timeSeparatorLabel = `Hôm qua, ${timeStr}`;
                          } else {
                            const dateStr = new Intl.DateTimeFormat('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            }).format(currentDate);
                            timeSeparatorLabel = `${dateStr}, ${timeStr}`;
                          }
                        }

                        return (
                          <MessageBubble
                            key={item.id}
                            item={item}
                            showTimeSeparator={showTimeSeparator}
                            timeSeparatorLabel={timeSeparatorLabel}
                            isLastRead={item.id === lastReadMessageId}
                            recipientAvatarUrl={selectedConversation?.user?.avatar_url ?? selectedChat?.avatarUrl ?? null}
                            recipientName={selectedConversation?.user?.full_name ?? selectedChat?.groupName ?? ''}
                            isGroup={selectedChat?.isGroup ?? false}
                          />
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="flex min-h-full flex-1 items-center justify-center rounded-[22px] bg-[#F8FAFC] px-4 py-4 text-sm text-slate-500">
                    Chưa có tin nhắn nào trong cuộc trò chuyện này.
                  </div>
                )}
              </div>
              <div className="mt-3 shrink-0 rounded-[24px] border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] transition-colors focus-within:border-slate-300">
                {/* Media preview strip */}
                {mediaPreview && (
                  <div className="relative mb-2 inline-block">
                    {mediaFile?.type.startsWith('video/') ? (
                      <video
                        src={mediaPreview}
                        className="h-24 w-36 rounded-[16px] object-cover bg-black"
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        className="h-24 w-24 rounded-[16px] object-cover"
                        alt="Preview"
                      />
                    )}
                    <button
                      onClick={() => { setMediaPreview(null); setMediaFile(null); }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {/* Hidden file input - accept both image and video */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMediaFile(file);
                        setMediaPreview(URL.createObjectURL(file));
                      }
                      e.target.value = '';
                    }}
                  />

                  {/* Single media upload button */}
                  <button
                    type="button"
                    title="Gửi ảnh / video"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedConversation && !selectedChat}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-[#EAF4FB] hover:text-[#4A9FD8] transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
                      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,200V172l52-52,44,44,28-28,52,52.07V200Z" />
                    </svg>
                  </button>

                  <textarea
                    className="no-focus-ring min-h-10 max-h-24 w-full resize-none overflow-y-auto rounded-[18px] bg-slate-50 px-4 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:shadow-none focus:ring-0 [box-shadow:none!important] [outline:none!important]"
                    disabled={!selectedConversation && !selectedChat}
                    onChange={(event) => {
                      const textarea = event.currentTarget;
                      textarea.style.height = '40px';
                      textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
                      setDraftMessage(event.target.value);
                      if (messageError) {
                        setMessageError(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && (draftMessage.trim() || mediaFile)) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder={(selectedConversation || selectedChat) ? 'Nhắn tin...' : 'Chọn một cuộc trò chuyện để nhắn tin'}
                    ref={composerTextareaRef}
                    rows={1}
                    value={draftMessage}
                  />
                  <button
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-[0.95] ${(normalizedDraftMessage.length === 0 && !mediaFile) || isSendingMessage || !selectedChat
                      ? 'cursor-not-allowed bg-slate-300'
                      : 'bg-slate-900 hover:bg-[#4A9FD8]'
                      }`}
                    disabled={(normalizedDraftMessage.length === 0 && !mediaFile) || isSendingMessage || !selectedChat}
                    onClick={handleSendMessage}
                    type="button"
                  >
                    {isSendingMessage || isUploadingMedia ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M231.87,114l-168-95.89A16,16,0,0,0,40.92,37l19.58,78.31A4,4,0,0,0,64.4,118H136a8,8,0,0,1,0,16H64.4a4,4,0,0,0-3.9,2.69L41,215.06A16,16,0,0,0,56.07,236a16.14,16.14,0,0,0,7.86-2.06l168-95.89A16,16,0,0,0,231.87,114Z" />
                      </svg>
                    )}
                  </button>
                </div>
                {messageError ? <ThemedText as="p" className="mt-3 text-sm text-rose-700">{messageError}</ThemedText> : null}
              </div>
            </section>

            <section className={`${surfaceClass} min-h-0 overflow-y-auto p-5`}>
              <ThemedText as="h2" className="text-[24px] font-semibold text-slate-950">Profile</ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-slate-500">
                {selectedChat?.isGroup ? 'Group info' : 'Conversation contact'}
              </ThemedText>
              <div className="mt-5 space-y-4">
                <div className="overflow-hidden rounded-[24px] bg-[#DBEAFE]">
                  <div className="h-[120px] bg-[#BFDBFE]" />
                  <div className="px-4 pb-4">
                    <div className="-mt-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-[#E2E8F0] text-sm font-semibold tracking-[0.6px] text-slate-900">
                      {selectedChat?.isGroup ? (
                        selectedChat.avatarUrl ? (
                          <img alt={selectedChat.groupName || 'Group'} className="h-full w-full object-cover" src={resolveAvatarUrl(selectedChat.avatarUrl) as string} />
                        ) : (
                          (selectedChat.groupName || 'GP').slice(0, 2).toUpperCase()
                        )
                      ) : selectedConversation && resolveAvatarUrl(selectedConversation.user?.avatar_url) ? (
                        <img alt={selectedConversation.user?.full_name || ''} className="h-full w-full object-cover" src={resolveAvatarUrl(selectedConversation.user?.avatar_url) as string} />
                      ) : (
                        selectedConversation ? selectedConversation.initials : 'DM'
                      )}
                    </div>
                    <ThemedText as="h3" className="mt-4 text-[24px] font-semibold text-slate-950">
                      {selectedChat?.isGroup
                        ? (selectedChat.groupName || 'Nhóm Trò Chuyện')
                        : selectedConversation
                          ? (selectedConversation.user?.full_name || 'Unknown')
                          : 'No profile selected'}
                    </ThemedText>
                    <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600">
                      {selectedChat?.isGroup
                        ? `${selectedChat.memberCount || '—'} thành viên`
                        : selectedConversation
                          ? selectedConversation.bio
                          : 'Chọn một cuộc trò chuyện để xem thêm ngữ cảnh người nhận.'}
                    </ThemedText>
                  </div>
                </div>

                {/* Media đã gửi (Shared Media) */}
                {(selectedConversation || selectedChat?.isGroup) && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <ThemedText as="h4" className="text-base font-semibold text-slate-900">
                        Media đã gửi
                      </ThemedText>
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {(selectedConversation?.messages ?? messages).filter((msg) => msg.mediaUrl).length}
                      </span>
                    </div>

                    {(selectedConversation?.messages ?? messages).filter((msg) => msg.mediaUrl).length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {(selectedConversation?.messages ?? messages)
                          .filter((msg) => msg.mediaUrl)
                          .map((msg) => {
                            const isVideo = isVideoMedia(msg.mediaUrl, msg.mediaType);
                            return (
                              <div
                                key={msg.id}
                                className="group relative aspect-square overflow-hidden rounded-[14px] bg-slate-100 border border-slate-100 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md"
                                onClick={() => {
                                  if (msg.mediaUrl) {
                                    setLightboxMessage(msg);
                                  }
                                }}
                              >
                                {isVideo ? (
                                  <>
                                    <video
                                      src={resolveMediaSrc(msg.mediaUrl!)}
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="#FFFFFF">
                                        <path d="M240,128a15.89,15.89,0,0,1-8,13.86l-144,83.07A16.14,16.14,0,0,1,80,227a15.86,15.86,0,0,1-8-2.14A15.8,15.8,0,0,1,64,211V45a15.8,15.8,0,0,1,8-13.86,15.89,15.89,0,0,1,16,0l144,83.07A15.89,15.89,0,0,1,240,128Z" />
                                      </svg>
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={resolveMediaSrc(msg.mediaUrl!)}
                                    alt="Shared media"
                                    className="h-full w-full object-cover group-hover:brightness-90 transition-all"
                                  />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="rounded-[18px] bg-slate-50 border border-slate-100 p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <ThemedText as="p" className="text-xs text-slate-400">
                          Chưa chia sẻ phương tiện nào
                        </ThemedText>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        {/* Lightbox Modal để xem ảnh/video phóng to trực tiếp */}
        {lightboxMessage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
            onClick={() => setLightboxMessage(null)}
          >
            <div className="absolute top-4 right-4 flex gap-3 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (lightboxMessage.mediaUrl) {
                    window.open(resolveMediaSrc(lightboxMessage.mediaUrl), '_blank');
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Mở trong tab mới"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M224,104a8,8,0,0,1-16,0V59.31l-68.69,68.69a8,8,0,0,1-11.31-11.31L196.69,48H152a8,8,0,0,1,0-16h72a8,8,0,0,1,8,8ZM112,40a8,8,0,0,0-8,8H48V208H208V152a8,8,0,0,0-16,0v40H64V64h40A8,8,0,0,0,112,40Z" />
                </svg>
              </button>
              <button
                onClick={() => setLightboxMessage(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all text-lg font-semibold cursor-pointer"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div
              className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-[24px] shadow-2xl transition-transform duration-300 ease-out scale-100 animate-zoomIn"
              onClick={(e) => e.stopPropagation()}
            >
              {isVideoMedia(lightboxMessage.mediaUrl, lightboxMessage.mediaType) ? (
                <video
                  src={resolveMediaSrc(lightboxMessage.mediaUrl!)}
                  controls
                  autoPlay
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-[24px]"
                />
              ) : (
                <img
                  src={resolveMediaSrc(lightboxMessage.mediaUrl!)}
                  alt="Enlarged media"
                  className="max-h-[85vh] max-w-[90vw] object-contain rounded-[24px]"
                />
              )}

              {/* Thông tin tin nhắn đi kèm (nếu có body văn bản) */}
              {lightboxMessage.body && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-6 text-white">
                  <p className="text-sm font-medium leading-relaxed drop-shadow-md">
                    {lightboxMessage.body}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Group Chat Modal */}
        {showCreateGroup && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowCreateGroup(false);
              setGroupName('');
              setGroupSearchQuery('');
              setGroupSearchResults([]);
              setSelectedGroupUserIds([]);
            }}
          >
            <div
              className="w-full max-w-[500px] rounded-[32px] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <ThemedText as="h2" className="text-lg font-bold text-slate-900">Tạo nhóm chat</ThemedText>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName('');
                    setGroupSearchQuery('');
                    setGroupSearchResults([]);
                    setSelectedGroupUserIds([]);
                  }}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="#475569">
                    <path d="M205.66,194.34a8,8,0,0,1-11.32,0L128,128,61.66,194.34a8,8,0,0,1-11.32-11.32L116.68,116.68,50.34,50.34A8,8,0,0,1,61.66,39L128,105.34,194.34,39a8,8,0,0,1,11.32,11.32L139.32,116.68l66.34,66.34A8,8,0,0,1,205.66,194.34Z" />
                  </svg>
                </button>
              </div>

              {/* Group name input */}
              <div className="mt-4">
                <ThemedText as="p" className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">Tên nhóm chat</ThemedText>
                <input
                  className="w-full text-[15px] leading-5 text-slate-900 px-4 py-3 bg-slate-50 rounded-[18px] border border-slate-100 outline-none focus:border-[#4A9FD8] transition-colors"
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  value={groupName}
                />
              </div>

              {/* Search members */}
              <div className="mt-4">
                <SearchInput onChange={handleGroupSearchChange} placeholder="Tìm thành viên..." value={groupSearchQuery} />
              </div>

              {/* Selected members count */}
              {selectedGroupUserIds.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-[#4A9FD8] bg-[#EAF4FB] px-2 py-0.5 rounded-full">
                    {selectedGroupUserIds.length} đã chọn
                  </span>
                </div>
              )}

              {/* Search results */}
              <div className="mt-3 max-h-[240px] overflow-y-auto">
                {isSearchingGroupUsers ? (
                  <div className="py-6 text-center text-sm text-slate-500">Đang tìm...</div>
                ) : groupSearchResults.length > 0 ? (
                  groupSearchResults.map((user) => {
                    const isSelected = selectedGroupUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        className={`flex w-full items-center justify-between rounded-[22px] px-4 py-3.5 mb-2 border transition-colors ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                          }`}
                        onClick={() => toggleGroupUser(user.id)}
                        type="button"
                      >
                        <div className="flex items-center gap-3 flex-1 mr-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#DBEAFE] overflow-hidden">
                            {resolveAvatarUrl(user.avatar_url) ? (
                              <img alt={user.full_name} className="h-full w-full object-cover" src={resolveAvatarUrl(user.avatar_url) as string} />
                            ) : (
                              <span className="text-xs font-semibold text-slate-900">
                                {buildInitials(user.first_name, user.last_name)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <ThemedText as="p" className="text-[15px] font-semibold text-slate-900 truncate">{user.full_name}</ThemedText>
                            <ThemedText as="p" className="text-xs text-slate-500 truncate">{user.bio || 'Chưa cập nhật giới thiệu.'}</ThemedText>
                          </div>
                        </div>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${isSelected ? 'bg-[#4A9FD8] border-[#4A9FD8]' : 'border-slate-300'
                          }`}>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#FFFFFF">
                              <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : groupSearchQuery.trim().length >= 2 ? (
                  <div className="py-6 text-center text-sm text-slate-500">Không tìm thấy người dùng.</div>
                ) : (
                  <div className="py-6 text-center text-sm text-slate-500">Nhập ít nhất 2 ký tự để tìm.</div>
                )}
              </div>

              {/* Create button */}
              <button
                className={`mt-4 w-full h-12 rounded-[18px] items-center justify-center flex gap-2 transition-all active:scale-[0.98] ${!groupName.trim() || selectedGroupUserIds.length === 0 || isCreatingGroup
                    ? 'bg-slate-200 cursor-not-allowed'
                    : 'bg-[#4A9FD8] hover:bg-[#2F8BC9]'
                  }`}
                disabled={!groupName.trim() || selectedGroupUserIds.length === 0 || isCreatingGroup}
                onClick={handleCreateGroup}
                type="button"
              >
                {isCreatingGroup ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="#FFFFFF">
                      <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.56-30,8,8,0,1,1-15.1-4A40,40,0,1,1,219,117.36a51.71,51.71,0,0,0,27.4,22.24A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,44,44,0,1,1,58.32,0A72.06,72.06,0,0,1,190.92,212ZM128,172a28,28,0,1,0-28-28A28,28,0,0,0,128,172Z" />
                    </svg>
                    <span className="text-sm font-semibold text-white">
                      Tạo nhóm ({selectedGroupUserIds.length} thành viên)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Chat Menu Dropdown */}
        {showChatMenu && selectedChat?.isGroup && (
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowChatMenu(false)}
          >
            <div
              className="absolute right-4 top-24 rounded-[20px] bg-white shadow-2xl overflow-hidden min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100">
                <ThemedText as="p" className="text-sm font-semibold text-slate-500">Tùy chọn</ThemedText>
              </div>
              <button
                className="flex w-full items-center gap-3 px-5 py-4 hover:bg-orange-50 transition-colors"
                onClick={requestLeaveGroup}
                type="button"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-orange-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="#F97316">
                    <path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z" />
                  </svg>
                </div>
                <div className="text-left">
                  <ThemedText as="p" className="text-sm font-semibold text-orange-600">Rời nhóm</ThemedText>
                  <ThemedText as="p" className="text-xs text-orange-400">Thoát khỏi nhóm này</ThemedText>
                </div>
              </button>
              <button
                className="flex w-full items-center gap-3 px-5 py-4 hover:bg-rose-50 transition-colors border-t border-slate-50"
                onClick={requestDeleteChat}
                type="button"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-rose-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="#EF4444">
                    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <ThemedText as="p" className="text-sm font-semibold text-rose-600">Xóa cuộc trò chuyện</ThemedText>
                  <ThemedText as="p" className="text-xs text-rose-400">Xóa toàn bộ tin nhắn</ThemedText>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Confirm Dialog */}
        {confirmDialog && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          >
            <div
              className="w-full max-w-[400px] rounded-[28px] bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] ${
                confirmDialog.type === 'delete' ? 'bg-rose-50' : 'bg-orange-50'
              }`}>
                {confirmDialog.type === 'delete' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="#EF4444">
                    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="#F97316">
                    <path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z" />
                  </svg>
                )}
              </div>
              <ThemedText as="h3" className="text-center text-lg font-bold text-slate-900">{confirmDialog.title}</ThemedText>
              <ThemedText as="p" className="mt-2 text-center text-sm leading-6 text-slate-500">{confirmDialog.description}</ThemedText>
              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 rounded-[18px] border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={confirmDialog.isLoading}
                  onClick={() => setConfirmDialog(null)}
                  type="button"
                >
                  Huỷ
                </button>
                <button
                  className={`flex flex-1 items-center justify-center rounded-[18px] py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] ${
                    confirmDialog.isLoading ? 'cursor-not-allowed opacity-60' :
                    confirmDialog.type === 'delete' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                  disabled={confirmDialog.isLoading}
                  onClick={handleConfirmAction}
                  type="button"
                >
                  {confirmDialog.isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}
