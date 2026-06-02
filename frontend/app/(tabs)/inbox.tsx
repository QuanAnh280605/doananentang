import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { InboxListItem, type InboxListItemData } from '@/components/inbox/InboxListItem';
import { MessageBubble, type MessageBubbleData } from '@/components/inbox/MessageBubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  listDirectChats,
  fetchChatMessages,
  sendChatMessage,
  markChatAsRead,
  uploadChatMedia,
  createDirectChat,
  createGroupChat,
  deleteChat,
  leaveGroup,
  uploadGroupAvatar,
  API_URL,
} from '@/lib/api';
import { fetchCurrentUser, searchUsers, type AuthUser, type SearchUser } from '@/lib/auth';
import { connectAppSocket, joinChatRoom, leaveChatRoom } from '@/lib/socket';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/useToast';
import type { ChatListItemRead, ChatMessageRead, ChatParticipant } from '@/lib/types';

const surfaceClass = 'rounded-surface border border-app-border bg-app-surface';

function AvatarPill({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return (
    <View
      className={`h-12 w-12 items-center justify-center rounded-[18px] ${muted ? 'bg-[#E2E8F0]' : 'bg-[#DBEAFE]'}`}>
      <ThemedText className="text-sm font-semibold tracking-[0.6px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
  className = '',
  contentClassName = '',
  headerAction,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerAction?: ReactNode;
}) {
  return (
    <ThemedView className={`${surfaceClass} p-5 ${className}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <ThemedText className="text-[24px] font-semibold text-slate-950">{title}</ThemedText>
          <ThemedText className="mt-1 text-sm text-slate-500">{subtitle}</ThemedText>
        </View>
        {headerAction}
      </View>
      <View className={`mt-5 gap-4 ${contentClassName}`}>{children}</View>
    </ThemedView>
  );
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export default function InboxScreen() {
  const router = useRouter();
  const { setUnreadChatCount } = useNotifications();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  const params = useLocalSearchParams<{ openChatId?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Layout breakpoints
  const useViewportLayout = width >= 1100;
  const viewportPanelHeight = Math.max(height - 120, 560);

  // States
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [chats, setChats] = useState<ChatListItemRead[]>([]);

  // Tự động đồng bộ dấu đỏ trên icon Envelope ở Header khi chats thay đổi hoặc được xem (mark read)
  useEffect(() => {
    const totalUnread = chats.reduce((sum, c) => sum + c.unread_count, 0);
    setUnreadChatCount(totalUnread > 0 ? 1 : 0);
  }, [chats, setUnreadChatCount]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageRead[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);

  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // New Chat Search states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [newChatSearchResults, setNewChatSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Group chat states
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);



  // Search states
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'personal' | 'groups'>('all');

  // Chat menu & media gallery states
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const messagesRef = useRef<ChatMessageRead[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 1. Initial Load (Current User & Chat List)
  useEffect(() => {
    fetchCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error('Failed to load current user:', err));

    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const res = await listDirectChats(1, 50);
      setChats(res.items);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // 2. Handle Auto-opening chat from Query Parameters (e.g. from Profile page)
  useEffect(() => {
    if (params.openChatId) {
      const targetId = Number(params.openChatId);
      if (Number.isInteger(targetId)) {
        setActiveChatId(targetId);
        // Clear params to avoid loop, and activate chat view in tab bar dynamically
        router.setParams({ openChatId: undefined });
      }
    }
  }, [params.openChatId, router]);

  // 2b. Sync chatActive param with activeChatId to toggle tab bar visibility
  useEffect(() => {
    if (activeChatId !== null) {
      router.setParams({ chatActive: 'true' });
    } else {
      router.setParams({ chatActive: undefined });
    }
  }, [activeChatId, router]);

  // 3. Handle Active Chat Selection & Message Fetching
  useEffect(() => {
    if (activeChatId === null) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMessages(true);
    fetchChatMessages(activeChatId, 1, 40)
      .then((res) => {
        if (cancelled) return;
        // API returns descending messages, we reverse them to display in chronological order
        const reversed = [...res.items].reverse();
        setMessages(reversed);
        scrollToBottom();
        // Mark as read in DB
        markChatAsRead(activeChatId).catch((err) => console.error('Failed to mark read:', err));

        // Instant updates in the local chat list unread badge
        setChats((prevChats) =>
          prevChats.map((c) => (c.chat_id === activeChatId ? { ...c, unread_count: 0 } : c))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        toastRef.current.error('Không thể tải tin nhắn: ' + err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingMessages(false);
      });

    return () => { cancelled = true; };
  }, [activeChatId]);

  const activeChatIdRef = useRef<number | null>(null);
  const currentUserRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // 4. Socket.io Realtime updates
  useEffect(() => {
    const socket = connectAppSocket();
    if (!socket) return;

    const handleMessageCreated = (payload: any) => {
      const chatId = payload.chat_id;
      const currentActiveChatId = activeChatIdRef.current;
      const currentAuthUser = currentUserRef.current;

      const nextMessage: ChatMessageRead = {
        id: payload.id,
        chat_id: chatId,
        sender_id: payload.sender_id,
        sender_name: payload.sender_name,
        content: payload.body || payload.content || '',
        media_url: payload.media_url,
        media_type: payload.media_type,
        created_at: payload.created_at,
      };

      // 1. Nếu đang mở cuộc trò chuyện này, thêm tin nhắn trực tiếp vào khung chat
      if (currentActiveChatId !== null && Number(chatId) === Number(currentActiveChatId)) {
        setMessages((prevMsgs) => {
          if (prevMsgs.some(m => Number(m.id) === Number(nextMessage.id))) return prevMsgs;
          const newMsgs = [...prevMsgs, nextMessage];
          scrollToBottom();
          return newMsgs;
        });

        // Cập nhật latest_message local + mark read — không cần gọi lại API
        if (currentAuthUser && Number(nextMessage.sender_id) !== Number(currentAuthUser.id)) {
          markChatAsRead(currentActiveChatId).catch((err) =>
            console.error('Failed to mark read realtime:', err)
          );
        }
        setChats((prevChats) =>
          prevChats.map((c) =>
            c.chat_id === Number(chatId)
              ? { ...c, latest_message: nextMessage, updated_at: nextMessage.created_at, unread_count: 0 }
              : c
          )
        );
      } else {
        // 2. Chat khác đang active — cập nhật local: đẩy lên đầu + tăng unread
        setChats((prevChats) => {
          const idx = prevChats.findIndex((c) => Number(c.chat_id) === Number(chatId));
          if (idx === -1) {
            // Chat mới chưa có trong danh sách → load lại từ API (hiếm)
            loadChats();
            return prevChats;
          }
          const updated: ChatListItemRead = {
            ...prevChats[idx],
            latest_message: nextMessage,
            updated_at: nextMessage.created_at,
            unread_count: prevChats[idx].unread_count + 1,
          };
          // Đẩy chat lên đầu danh sách
          return [updated, ...prevChats.filter((_, i) => i !== idx)];
        });
      }
    };

    socket.on('message-created', handleMessageCreated);

    return () => {
      socket.off('message-created', handleMessageCreated);
    };
  }, []);

  useEffect(() => {
    if (activeChatId === null) return;

    joinChatRoom(activeChatId.toString());

    return () => {
      leaveChatRoom(activeChatId.toString());
    };
  }, [activeChatId]);

  // 5. Debounced User Search for starting new chats
  useEffect(() => {
    if (!showNewChatModal) return;

    if (!newChatSearchQuery.trim()) {
      setNewChatSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    const delayDebounceFn = setTimeout(() => {
      searchUsers(newChatSearchQuery, 1, 20)
        .then((res) => {
          setNewChatSearchResults(res.items);
        })
        .catch((err) => console.error('Failed to search users:', err))
        .finally(() => setIsSearchingUsers(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [newChatSearchQuery, showNewChatModal]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Find active chat participant
  const activeChat = useMemo(() => {
    return chats.find((c) => c.chat_id === activeChatId) || null;
  }, [chats, activeChatId]);

  const isGroup = activeChat?.is_group === true;

  const activeParticipant: ChatParticipant | null = useMemo(() => {
    return activeChat?.participant || null;
  }, [activeChat]);



  // Get Initials for Avatar
  const getInitials = (participant: ChatParticipant | null | SearchUser): string => {
    if (!participant) return '??';
    const first = participant.first_name ? participant.first_name[0] : '';
    const last = participant.last_name ? participant.last_name[0] : '';
    return (first + last).toUpperCase() || participant.full_name.slice(0, 2).toUpperCase();
  };

  const getGroupInitials = (name: string): string => {
    if (!name) return 'GP';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle Start Chat with User from Search
  const handleStartNewChat = async (targetUserId: number) => {
    setShowNewChatModal(false);
    setNewChatSearchQuery('');
    setNewChatSearchResults([]);

    try {
      const chat = await createDirectChat(targetUserId);
      await loadChats();
      setActiveChatId(chat.chat_id);
    } catch (err: any) {
      toast.error('Không thể bắt đầu cuộc trò chuyện: ' + err.message);
    }
  };

  // Handle Create Group Chat
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm.');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thành viên.');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const chat = await createGroupChat(groupName.trim(), selectedUserIds);
      toast.success('Đã tạo nhóm thành công!');
      setShowNewChatModal(false);
      // Reset group states
      setGroupName('');
      setSelectedUserIds([]);
      setIsGroupMode(false);
      setNewChatSearchQuery('');
      setNewChatSearchResults([]);

      await loadChats();
      setActiveChatId(chat.chat_id);
    } catch (err: any) {
      toast.error('Tạo nhóm thất bại: ' + err.message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleSelectUserForGroup = (userId: number) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleDeleteChat = () => {
    if (activeChatId === null) return;

    Alert.alert(
      'Xóa cuộc trò chuyện',
      'Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Toàn bộ lịch sử tin nhắn sẽ bị xóa vĩnh viễn.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChat(activeChatId);
              setShowChatMenu(false);
              setActiveChatId(null);
              await loadChats();
              Alert.alert('Thành công', 'Đã xóa cuộc trò chuyện thành công.');
            } catch (err: any) {
              toast.error('Xóa cuộc trò chuyện thất bại: ' + err.message);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (activeChatId === null) return;

    Alert.alert(
      'Rời khỏi nhóm',
      'Bạn có chắc chắn muốn rời khỏi nhóm này? Bạn sẽ không còn nhận được tin nhắn từ nhóm.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(activeChatId);
              setShowChatMenu(false);
              setActiveChatId(null);
              await loadChats();
              toast.success('Đã rời khỏi nhóm thành công.');
            } catch (err: any) {
              toast.error('Rời nhóm thất bại: ' + err.message);
            }
          },
        },
      ]
    );
  };

  // Handle Send Text Message & Multiple Selected Media
  const handleSendMessage = async () => {
    if (activeChatId === null || isSending) return;
    if (!draftMessage.trim() && selectedImageUris.length === 0) return;

    const messageText = draftMessage;
    const imageUrisToSend = [...selectedImageUris];

    setDraftMessage('');
    setSelectedImageUris([]); // Xóa preview ngay lập tức để phản hồi UI mượt mà
    setIsSending(true);

    try {
      // 1. Tải lên toàn bộ ảnh song song để tối ưu tốc độ mạng
      const uploadPromises = imageUrisToSend.map((uri) => uploadChatMedia(uri));
      const uploadResults = await Promise.all(uploadPromises);
      const mediaUrls = uploadResults.map((res) => res.url);

      // 2. Gửi tin nhắn văn bản trước (nếu có)
      if (messageText.trim()) {
        const newMsg = await sendChatMessage(activeChatId, messageText.trim());
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
      }

      // 3. Gửi từng tin nhắn ảnh lần lượt để đảm bảo thứ tự hiển thị chính xác
      for (const mediaUrl of mediaUrls) {
        const newMsg = await sendChatMessage(activeChatId, undefined, mediaUrl);
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(newMsg.id))) return prev;
          return [...prev, newMsg];
        });
      }

      scrollToBottom();
      loadChats();
    } catch (err: any) {
      setDraftMessage(messageText); // khôi phục lại chữ đã nhập
      setSelectedImageUris(imageUrisToSend); // khôi phục lại danh sách ảnh xem trước
      toast.error('Gửi tin nhắn thất bại: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Select Multiple Images (Save URIs to Preview state, not uploading immediately)
  const handleSelectImage = async () => {
    if (activeChatId === null) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error('Ứng dụng cần quyền truy cập thư viện ảnh để gửi hình ảnh.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Cho phép chọn nhiều ảnh
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const selectedUris = pickerResult.assets.map((asset) => asset.uri);
      // Hợp nhất với danh sách ảnh đã chọn trước đó (nếu có) để người dùng có thể chọn thêm nhiều đợt
      setSelectedImageUris((prev) => [...prev, ...selectedUris]);
    } catch (err: any) {
      toast.error('Chọn hình ảnh thất bại: ' + err.message);
    }
  };

  // Handle Change Group Avatar
  const [isUpdatingGroupAvatar, setIsUpdatingGroupAvatar] = useState(false);
  const handleChangeGroupAvatar = async () => {
    if (activeChatId === null || isUpdatingGroupAvatar) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error('Ứng dụng cần quyền truy cập thư viện ảnh để thay đổi avatar nhóm.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const selectedUri = pickerResult.assets[0].uri;
      setIsUpdatingGroupAvatar(true);
      toast.success('Đang tải ảnh đại diện nhóm mới lên...');

      const updatedChat = await uploadGroupAvatar(activeChatId, selectedUri);
      toast.success('Thay đổi avatar nhóm thành công!');

      // Cập nhật danh sách chat local
      setChats((prevChats) =>
        prevChats.map((c) => (c.chat_id === activeChatId ? { ...c, avatar_url: updatedChat.avatar_url } : c))
      );
    } catch (err: any) {
      toast.error('Thay đổi avatar nhóm thất bại: ' + err.message);
    } finally {
      setIsUpdatingGroupAvatar(false);
    }
  };

  // Filtered Chats
  const normalizedSearchQuery = inboxSearchQuery.trim().toLowerCase();
  const filteredChats = chats.filter((chat) => {
    // Filter by tab
    if (filterTab === 'personal' && chat.is_group) return false;
    if (filterTab === 'groups' && !chat.is_group) return false;

    if (!normalizedSearchQuery) return true;
    const name = chat.is_group ? (chat.group_name || '') : (chat.participant?.full_name || '');
    return (
      name.toLowerCase().includes(normalizedSearchQuery) ||
      (chat.latest_message?.content && chat.latest_message.content.toLowerCase().includes(normalizedSearchQuery))
    );
  });

  // Map backend model list items to components
  const mappedInboxThreads: InboxListItemData[] = filteredChats.map((chat) => {
    const isGroup = chat.is_group === true;
    const name = isGroup ? (chat.group_name || 'Nhóm Trò Chuyện') : (chat.participant?.full_name || 'Người dùng');
    const initials = isGroup ? getGroupInitials(name) : getInitials(chat.participant);
    let preview = 'Chưa có tin nhắn';
    if (chat.latest_message) {
      const msgContent = chat.latest_message.content || '[Hình ảnh]';
      // For group chats, show sender name before message
      if (isGroup && chat.latest_message.sender_name) {
        preview = `${chat.latest_message.sender_name}: ${msgContent}`;
      } else {
        preview = msgContent;
      }
    }
    return {
      id: chat.chat_id.toString(),
      name: name,
      preview: preview,
      time: chat.latest_message ? formatTime(chat.latest_message.created_at) : formatTime(chat.updated_at),
      initials: initials,
      avatarUrl: isGroup ? (chat.avatar_url || null) : (chat.participant?.avatar_url || null),
      bio: isGroup ? `${chat.member_count || '—'} thành viên` : (chat.participant?.bio || undefined),
      active: chat.chat_id === activeChatId,
      unread: chat.unread_count,
    };
  });

  // Map backend messages to bubbles
  const mappedMessages: MessageBubbleData[] = messages.map((msg) => {
    return {
      id: msg.id.toString(),
      body: msg.content,
      time: formatTime(msg.created_at),
      incoming: currentUser ? msg.sender_id !== currentUser.id : true,
      senderName: msg.sender_name,
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
    };
  });

  // Extract all image messages for the media gallery
  const mediaMessages = messages.filter(
    (msg) => msg.media_url && (msg.media_type?.startsWith('image') || !msg.media_type)
  );

  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_URL}${url}`;
  };

  const newChatButton = (
    <Pressable
      className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 active:opacity-90 border border-slate-200"
      onPress={() => setShowNewChatModal(true)}>
      <MaterialIcons color="#4A9FD8" name="chat" size={20} />
    </Pressable>
  );

  // Content for Cột 1: Inbox List
  const renderInboxList = () => (
    <SectionShell
      title="Hộp thư"
      subtitle="Các cuộc trò chuyện gần đây"
      className="h-full"
      contentClassName="min-h-0 flex-1 gap-3"
      headerAction={newChatButton}>
      <SearchInput onChangeText={setInboxSearchQuery} placeholder="Tìm kiếm hội thoại..." value={inboxSearchQuery} />

      {/* Bộ lọc Tab ngang cao cấp */}
      <View className="flex-row gap-2 my-0.5">
        {(['all', 'personal', 'groups'] as const).map((tab) => {
          const isActive = filterTab === tab;
          const label = tab === 'all' ? 'Tất cả' : tab === 'personal' ? 'Cá nhân' : 'Nhóm';
          return (
            <Pressable
              key={tab}
              onPress={() => setFilterTab(tab)}
              className={`rounded-full px-4 py-1.5 active:opacity-85 ${isActive ? 'bg-[#4A9FD8]' : 'bg-slate-100'}`}
            >
              <ThemedText className={`text-[13px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        className={useViewportLayout ? 'min-h-0 flex-1' : ''}
        contentContainerClassName="gap-3"
        showsVerticalScrollIndicator={false}>
        {isLoadingChats ? (
          <View className="py-8 justify-center items-center">
            <ActivityIndicator color="#4A9FD8" size="large" />
          </View>
        ) : mappedInboxThreads.length === 0 ? (
          <View className="py-12 items-center justify-center gap-4">
            <MaterialIcons color="#94A3B8" name="chat-bubble-outline" size={40} />
            <ThemedText className="text-slate-400 text-sm text-center">
              Chưa có cuộc trò chuyện nào.
            </ThemedText>
            <Pressable
              className="rounded-[18px] bg-slate-900 px-4 py-3 active:opacity-90 flex-row items-center gap-2"
              onPress={() => setShowNewChatModal(true)}>
              <MaterialIcons color="#FFFFFF" name="add" size={16} />
              <ThemedText className="text-xs font-semibold text-white">Bắt đầu trò chuyện</ThemedText>
            </Pressable>
          </View>
        ) : (
          mappedInboxThreads.map((item) => (
            <InboxListItem
              key={item.id}
              item={item}
              onPress={() => {
                setActiveChatId(Number(item.id));
              }}
            />
          ))
        )}
      </ScrollView>
    </SectionShell>
  );

  // Content for Cột 2: Conversation View
  const renderConversation = () => {
    if (activeChatId === null || !activeChat) {
      return (
        <ThemedView className={`${surfaceClass} p-5 items-center justify-center flex-1 min-h-[350px] bg-[#FCFDFE]`}>
          <MaterialIcons color="#4A9FD8" name="forum" size={56} />
          <ThemedText className="mt-4 text-lg font-bold text-slate-800">
            Chưa chọn cuộc hội thoại nào
          </ThemedText>
          <ThemedText className="mt-2 text-sm text-slate-500 text-center max-w-[280px]">
            Hãy chọn một cuộc hội thoại từ danh sách bên trái hoặc nhấn nút **Tin nhắn mới** để bắt đầu chat!
          </ThemedText>
          <Pressable
            className="mt-5 rounded-[18px] bg-[#4A9FD8] px-5 py-3 active:opacity-90 flex-row items-center gap-2"
            onPress={() => setShowNewChatModal(true)}>
            <MaterialIcons color="#FFFFFF" name="chat" size={18} />
            <ThemedText className="text-sm font-semibold text-white">Tin nhắn mới</ThemedText>
          </Pressable>
        </ThemedView>
      );
    }



    const title = isGroup ? (activeChat.group_name || 'Nhóm Trò Chuyện') : (activeParticipant?.full_name || 'Người dùng');
    const initials = isGroup ? getGroupInitials(title) : getInitials(activeParticipant);
    const avatarUrl = isGroup ? (activeChat.avatar_url || null) : (activeParticipant?.avatar_url || null);
    const getAbsoluteAvatarUrl = (url: string | null) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${API_URL}${url}`;
    };

    return (
      <ThemedView className={`flex-1 h-full min-h-[350px] bg-[#FCFDFE] px-4 pb-4 ${useViewportLayout ? 'rounded-surface border border-app-border pt-2.5' : ''}`}
        style={!useViewportLayout ? { paddingTop: Math.max(insets.top, 0) + 10 } : undefined}>
        {/* Header tinh gọn ở phía trên */}
        <View className="flex-row items-center gap-3 pb-3 mb-2 border-b border-slate-100">
          {!useViewportLayout && (
            <Pressable
              hitSlop={20}
              style={{ zIndex: 50, elevation: 50 }}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
              onPress={() => {
                setActiveChatId(null);
              }}>
              <MaterialIcons color="#475569" name="arrow-back" size={20} />
            </Pressable>
          )}

          {/* Avatar & Tên người nhắn (Ấn vào để mở profile) */}
          <Pressable
            className="flex-row items-center gap-3 active:opacity-80 flex-1"
            onPress={() => {
              if (isGroup) {
                toast.success('Đây là nhóm chat: ' + title);
              } else if (activeParticipant) {
                router.push(`/profile/${activeParticipant.id}`);
              }
            }}>
            {avatarUrl ? (
              <Image
                source={{ uri: getAbsoluteAvatarUrl(avatarUrl)! }}
                className="h-11 w-11 rounded-full bg-slate-200 border border-slate-200"
              />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#EAF4FB]">
                <ThemedText className="text-sm font-semibold text-[#4A9FD8]">{initials}</ThemedText>
              </View>
            )}
            <View className="flex-1">
              <ThemedText className="text-base font-bold text-slate-900 truncate">
                {title}
              </ThemedText>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View className={`h-2 w-2 rounded-full ${isGroup ? 'bg-[#4A9FD8]' : 'bg-green-500'}`} />
                <ThemedText className="text-[11px] font-medium text-slate-400">
                  {isGroup
                    ? `${activeChat.member_count || '—'} thành viên`
                    : 'Đang hoạt động'}
                </ThemedText>
              </View>
            </View>
          </Pressable>

          {/* Nút ba chấm - menu tùy chọn */}
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
            onPress={() => setShowChatMenu(true)}>
            <MaterialIcons color="#475569" name="more-vert" size={20} />
          </Pressable>
        </View>

        {/* Phần danh sách tin nhắn chiếm trọn không gian */}
        <View className="min-h-0 flex-1 bg-[#FCFDFE] px-1 py-2">
          {isLoadingMessages ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator color="#4A9FD8" size="large" />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              className="min-h-0 flex-1"
              contentContainerClassName="gap-3.5 py-2 px-1"
              onContentSizeChange={scrollToBottom}
              showsVerticalScrollIndicator={false}>
              {mappedMessages.map((item) => (
                <MessageBubble key={item.id} item={item} isGroup={isGroup} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* PANEL PREVIEW NHIỀU ẢNH (Chỉ hiển thị khi có selectedImageUris) */}
        {selectedImageUris.length > 0 && (
          <View className="flex-row items-center mb-2 px-2 mt-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 10 }}
            >
              {selectedImageUris.map((uri, idx) => (
                <View key={`${uri}-${idx}`} className="relative h-20 w-20 rounded-[14px] overflow-hidden border border-slate-200 shadow-sm bg-white">
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                  />
                  
                  {/* Nút Xóa Preview Ảnh */}
                  <Pressable
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full items-center justify-center active:opacity-80"
                    onPress={() => {
                      setSelectedImageUris((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    hitSlop={10}
                  >
                    <MaterialIcons color="#FFFFFF" name="close" size={14} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Thanh nhập tin nhắn siêu tối giản - Đã căn chỉnh lại tỷ lệ và bo góc */}
        <View className="flex-row items-center gap-2 rounded-[28px] bg-[#F1F5F9] p-1.5 mt-2">
          {/* Nút Chọn Ảnh */}
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80 shadow-sm"
            onPress={handleSelectImage}>
            <MaterialIcons color="#475569" name="image" size={20} />
          </Pressable>

          {/* Ô Nhập Tin Nhắn - Cân đối lại padding dọc và căn giữa hoàn hảo */}
          <TextInput
            className="flex-1 max-h-[100px] min-h-[44px] text-[15px] leading-5 text-slate-900 px-4 py-2.5 bg-white rounded-[22px]"
            cursorColor="#4A9FD8"
            multiline
            onChangeText={setDraftMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94A3B8"
            selectionColor="rgba(74, 159, 216, 0.24)"
            textAlignVertical="center"
            underlineColorAndroid="transparent"
            value={draftMessage}
            style={{ textAlignVertical: 'center' }}
          />

          {/* Nút Gửi (Send) */}
          {(() => {
            const canSend = draftMessage.trim().length > 0 || selectedImageUris.length > 0;
            return (
              <Pressable
                className={`h-11 w-11 items-center justify-center rounded-full ${!canSend || isSending ? 'bg-slate-200' : 'bg-[#4A9FD8]'} active:opacity-80 shadow-sm`}
                disabled={isSending || !canSend}
                onPress={handleSendMessage}>
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <MaterialIcons color={!canSend ? '#94A3B8' : '#FFFFFF'} name="send" size={20} />
                )}
              </Pressable>
            );
          })()}
        </View>
      </ThemedView>
    );
  };

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]">
        <ThemedView 
          className="mx-auto w-full max-w-[1720px] px-4 pb-6 md:px-6 flex-1"
          style={{ paddingTop: Math.max(insets.top, 0) + 12 }}
        >

          {useViewportLayout ? (
            // Desktop/Web Layout: 2 Columns
            <View
              className="flex-row items-stretch gap-4 mt-4"
              style={{ height: viewportPanelHeight }}>
              <View className="w-[360px]">{renderInboxList()}</View>
              <View className="min-w-0 flex-1">{renderConversation()}</View>
            </View>
          ) : (
            // Mobile/Tablet Adaptive Layout: Single-view based on active conversation
            <View className={(!useViewportLayout && activeChatId !== null) ? "w-full flex-1" : "mt-2 w-full flex-1"}>
              {activeChatId === null ? (
                <View className="w-full flex-1">{renderInboxList()}</View>
              ) : (
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={{ flex: 1 }}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
                  <View className="w-full flex-1">{renderConversation()}</View>
                </KeyboardAvoidingView>
              )}
            </View>
          )}
        </ThemedView>
      </ThemedView>

      {/* NEW CHAT MODAL - Allows starting direct chat or creating groups */}
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setShowNewChatModal(false);
          setGroupName('');
          setSelectedUserIds([]);
          setIsGroupMode(false);
          setNewChatSearchQuery('');
          setNewChatSearchResults([]);
        }}
        transparent={true}
        visible={showNewChatModal}>
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <ThemedView className="w-full max-w-[500px] rounded-[32px] bg-white p-6 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
              <ThemedText className="text-lg font-bold text-slate-900">Cuộc trò chuyện mới</ThemedText>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
                onPress={() => {
                  setShowNewChatModal(false);
                  setGroupName('');
                  setSelectedUserIds([]);
                  setIsGroupMode(false);
                  setNewChatSearchQuery('');
                  setNewChatSearchResults([]);
                }}>
                <MaterialIcons color="#475569" name="close" size={18} />
              </Pressable>
            </View>

            {/* Chuyển đổi Direct Chat / Group Chat */}
            <View className="flex-row rounded-[18px] bg-slate-100 p-1 mt-4">
              <Pressable
                className={`flex-1 py-2.5 rounded-[14px] items-center justify-center ${!isGroupMode ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setIsGroupMode(false)}>
                <ThemedText className={`text-sm font-semibold ${!isGroupMode ? 'text-[#4A9FD8]' : 'text-slate-500'}`}>
                  Nhắn tin 1-1
                </ThemedText>
              </Pressable>
              <Pressable
                className={`flex-1 py-2.5 rounded-[14px] items-center justify-center ${isGroupMode ? 'bg-white shadow-sm' : ''}`}
                onPress={() => setIsGroupMode(true)}>
                <ThemedText className={`text-sm font-semibold ${isGroupMode ? 'text-[#4A9FD8]' : 'text-slate-500'}`}>
                  Tạo nhóm chat
                </ThemedText>
              </Pressable>
            </View>

            {/* Nhập tên nhóm nếu ở chế độ Tạo nhóm */}
            {isGroupMode && (
              <View className="mt-4">
                <ThemedText className="text-xs font-semibold text-slate-500 mb-1.5 ml-1">Tên nhóm chat</ThemedText>
                <TextInput
                  className="w-full text-[15px] leading-5 text-slate-900 px-4 py-3 bg-slate-50 rounded-[18px] border border-slate-100"
                  cursorColor="#4A9FD8"
                  onChangeText={setGroupName}
                  placeholder="Nhập tên nhóm..."
                  placeholderTextColor="#94A3B8"
                  selectionColor="rgba(74, 159, 216, 0.24)"
                  value={groupName}
                />
              </View>
            )}

            {/* Tìm kiếm thành viên */}
            <View className="mt-4">
              <SearchInput
                onChangeText={setNewChatSearchQuery}
                placeholder={isGroupMode ? "Tìm thành viên..." : "Tìm tên hoặc email bạn bè..."}
                value={newChatSearchQuery}
              />
            </View>

            {/* Kết quả tìm kiếm */}
            <ScrollView className="mt-4 max-h-[240px]" showsVerticalScrollIndicator={false}>
              {isSearchingUsers ? (
                <View className="py-6 justify-center items-center">
                  <ActivityIndicator color="#4A9FD8" size="small" />
                </View>
              ) : newChatSearchResults.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <ThemedText className="text-slate-400 text-sm">
                    {newChatSearchQuery ? 'Không tìm thấy người dùng nào.' : 'Nhập từ khóa để tìm bạn bè...'}
                  </ThemedText>
                </View>
              ) : (
                newChatSearchResults.map((user) => {
                  const initials = getInitials(user);
                  const isSelected = selectedUserIds.includes(user.id);
                  const getAbsoluteAvatarUrl = (url: string | null) => {
                    if (!url) return null;
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    return `${API_URL}${url}`;
                  };

                  return (
                    <Pressable
                      key={user.id}
                      className={`flex-row items-center justify-between rounded-[22px] px-4 py-3.5 mb-2 border active:bg-slate-100 ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}
                      onPress={() => {
                        if (isGroupMode) {
                          toggleSelectUserForGroup(user.id);
                        } else {
                          handleStartNewChat(user.id);
                        }
                      }}>
                      <View className="flex-row items-center gap-3 flex-1 mr-3">
                        {user.avatar_url ? (
                          <Image
                            source={{ uri: getAbsoluteAvatarUrl(user.avatar_url)! }}
                            className="h-10 w-10 rounded-[14px] bg-slate-200"
                          />
                        ) : (
                          <AvatarPill initials={initials} muted />
                        )}
                        <View className="flex-1">
                          <ThemedText className="text-[15px] font-semibold text-slate-900 truncate">
                            {user.full_name}
                          </ThemedText>
                          <ThemedText className="text-xs text-slate-500 truncate mt-0.5">
                            {user.bio || 'Chưa cập nhật giới thiệu.'}
                          </ThemedText>
                        </View>
                      </View>

                      {isGroupMode ? (
                        <View className={`h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'bg-[#4A9FD8] border-[#4A9FD8]' : 'border-slate-300'}`}>
                          {isSelected && <MaterialIcons color="#FFFFFF" name="check" size={14} />}
                        </View>
                      ) : (
                        <View className="rounded-[14px] bg-[#4A9FD8] px-3.5 py-2">
                          <ThemedText className="text-xs font-semibold text-white">Nhắn tin</ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {/* Nút Tạo Nhóm (chỉ hiển thị ở chế độ nhóm) */}
            {isGroupMode && (
              <Pressable
                className={`mt-4 w-full h-12 rounded-[18px] items-center justify-center ${(!groupName.trim() || selectedUserIds.length === 0 || isCreatingGroup) ? 'bg-slate-200' : 'bg-[#4A9FD8]'} active:opacity-90 flex-row gap-2`}
                disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreatingGroup}
                onPress={handleCreateGroup}>
                {isCreatingGroup ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons color="#FFFFFF" name="group-add" size={18} />
                    <ThemedText className="text-sm font-semibold text-white">
                      Tạo nhóm ({selectedUserIds.length} thành viên)
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* CHAT MENU MODAL - Ba chấm dropdown */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowChatMenu(false)}
        transparent={true}
        visible={showChatMenu}>
        <Pressable
          className="flex-1 bg-black/30"
          onPress={() => setShowChatMenu(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="absolute right-4 rounded-[20px] bg-white shadow-2xl overflow-hidden"
            style={{ top: Math.max(insets.top, 0) + 80, minWidth: 200 }}>
            {/* Header */}
            <View className="px-5 py-4 border-b border-slate-100">
              <ThemedText className="text-sm font-semibold text-slate-500">Tùy chọn</ThemedText>
            </View>

            {/* Xem ảnh đã gửi */}
            <Pressable
              className="flex-row items-center gap-3 px-5 py-4 active:bg-slate-50 border-b border-slate-50"
              onPress={() => {
                setShowChatMenu(false);
                setShowMediaGallery(true);
              }}>
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#EAF4FB]">
                <MaterialIcons color="#4A9FD8" name="photo-library" size={18} />
              </View>
              <View>
                <ThemedText className="text-sm font-semibold text-slate-900">Ảnh đã gửi</ThemedText>
                <ThemedText className="text-xs text-slate-400">{mediaMessages.length} ảnh</ThemedText>
              </View>
            </Pressable>

            {/* Thay đổi ảnh nhóm (Chỉ hiển thị nếu là nhóm) */}
            {isGroup && (
              <Pressable
                className="flex-row items-center gap-3 px-5 py-4 active:bg-slate-50 border-b border-slate-50"
                disabled={isUpdatingGroupAvatar}
                onPress={() => {
                  setShowChatMenu(false);
                  handleChangeGroupAvatar();
                }}>
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-blue-50">
                  {isUpdatingGroupAvatar ? (
                    <ActivityIndicator color="#4A9FD8" size="small" />
                  ) : (
                    <MaterialIcons color="#4A9FD8" name="photo-camera" size={18} />
                  )}
                </View>
                <View>
                  <ThemedText className="text-sm font-semibold text-slate-900">Thay đổi ảnh nhóm</ThemedText>
                  <ThemedText className="text-xs text-slate-400">Chọn ảnh đại diện mới</ThemedText>
                </View>
              </Pressable>
            )}

            {/* Rời nhóm (Chỉ hiển thị nếu là nhóm) */}
            {isGroup && (
              <Pressable
                className="flex-row items-center gap-3 px-5 py-4 active:bg-orange-50 border-b border-slate-50"
                onPress={() => {
                  setShowChatMenu(false);
                  handleLeaveGroup();
                }}>
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-orange-50">
                  <MaterialIcons color="#F97316" name="logout" size={18} />
                </View>
                <View>
                  <ThemedText className="text-sm font-semibold text-orange-600">Rời nhóm</ThemedText>
                  <ThemedText className="text-xs text-orange-400">Thoát khỏi nhóm này</ThemedText>
                </View>
              </Pressable>
            )}

            {/* Xóa cuộc trò chuyện */}
            <Pressable
              className="flex-row items-center gap-3 px-5 py-4 active:bg-red-50"
              onPress={handleDeleteChat}>
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-red-50">
                <MaterialIcons color="#EF4444" name="delete-outline" size={18} />
              </View>
              <View>
                <ThemedText className="text-sm font-semibold text-red-600">Xóa cuộc trò chuyện</ThemedText>
                <ThemedText className="text-xs text-red-400">Xóa toàn bộ lịch sử</ThemedText>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MEDIA GALLERY MODAL - Xem tất cả ảnh đã gửi trong cuộc hội thoại */}
      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (fullscreenImageUrl) {
            setFullscreenImageUrl(null);
          } else {
            setShowMediaGallery(false);
          }
        }}
        transparent={false}
        visible={showMediaGallery}>
        <View className="flex-1 bg-[#F8FAFC]" style={{ paddingTop: Math.max(insets.top, 0) }}>
          {/* Gallery Header */}
          <View className="flex-row items-center gap-3 px-5 py-4 bg-white border-b border-slate-100">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
              onPress={() => {
                if (fullscreenImageUrl) {
                  setFullscreenImageUrl(null);
                } else {
                  setShowMediaGallery(false);
                }
              }}>
              <MaterialIcons color="#475569" name={fullscreenImageUrl ? 'close' : 'arrow-back'} size={20} />
            </Pressable>
            <View className="flex-1">
              <ThemedText className="text-base font-bold text-slate-900">
                {fullscreenImageUrl ? 'Xem ảnh' : 'Ảnh đã gửi'}
              </ThemedText>
              {!fullscreenImageUrl && (
                <ThemedText className="text-xs text-slate-400">{mediaMessages.length} ảnh</ThemedText>
              )}
            </View>
          </View>

          {fullscreenImageUrl ? (
            // Fullscreen single image view
            <View className="flex-1 items-center justify-center bg-black">
              <Image
                source={{ uri: fullscreenImageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
          ) : mediaMessages.length === 0 ? (
            // Empty state
            <View className="flex-1 items-center justify-center gap-4">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <MaterialIcons color="#94A3B8" name="photo-library" size={36} />
              </View>
              <ThemedText className="text-base font-semibold text-slate-600">Chưa có ảnh nào</ThemedText>
              <ThemedText className="text-sm text-slate-400 text-center px-8">
                Các ảnh được gửi trong cuộc hội thoại này sẽ xuất hiện ở đây.
              </ThemedText>
            </View>
          ) : (
            // Grid of images
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 4 }}
              showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap">
                {mediaMessages.map((msg) => {
                  const uri = getAbsoluteUrl(msg.media_url!);
                  return (
                    <Pressable
                      key={msg.id}
                      style={{ width: '33.33%', padding: 2, aspectRatio: 1 }}
                      className="active:opacity-80"
                      onPress={() => setFullscreenImageUrl(uri)}>
                      <Image
                        source={{ uri }}
                        style={{ width: '100%', height: '100%', borderRadius: 10 }}
                        contentFit="cover"
                      />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}
