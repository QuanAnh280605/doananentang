import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { InboxListItem, type InboxListItemData } from '@/components/inbox/InboxListItem';
import { MessageBubble, type MessageBubbleData } from '@/components/inbox/MessageBubble';
import { ProfilePanelStat, type ProfilePanelStatData } from '@/components/inbox/ProfilePanelStat';
import { AppTopNav } from '@/components/navigation/AppTopNav';
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
  API_URL,
} from '@/lib/api';
import { fetchCurrentUser, searchUsers, type AuthUser, type SearchUser } from '@/lib/auth';
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
  const params = useLocalSearchParams<{ openChatId?: string }>();
  const { width, height } = useWindowDimensions();

  // Layout breakpoints
  const useViewportLayout = width >= 1100;
  const isTablet = width >= 768;
  const viewportPanelHeight = Math.max(height - 120, 560);

  // States
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [chats, setChats] = useState<ChatListItemRead[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageRead[]>([]);
  const [draftMessage, setDraftMessage] = useState('');

  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Chat Search states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [newChatSearchResults, setNewChatSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Search states
  const [inboxNavSearchQuery, setInboxNavSearchQuery] = useState('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');

  // Mobile navigation/modal overlay state
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);

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
        // Clear params to avoid loop
        router.setParams({ openChatId: undefined });
      }
    }
  }, [params.openChatId, router]);

  // 3. Handle Active Chat Selection & Message Fetching
  useEffect(() => {
    if (activeChatId === null) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    fetchChatMessages(activeChatId, 1, 40)
      .then((res) => {
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
      .catch((err) => Alert.alert('Lỗi', 'Không thể tải tin nhắn: ' + err.message))
      .finally(() => setIsLoadingMessages(false));
  }, [activeChatId]);

  // 4. Polling for New Messages (Every 3 seconds)
  useEffect(() => {
    if (activeChatId === null) return;

    const interval = setInterval(() => {
      fetchChatMessages(activeChatId, 1, 30)
        .then((res) => {
          const reversed = [...res.items].reverse();
          const currentMsgs = messagesRef.current;
          // Deep compare simple IDs length to trigger re-render
          if (
            reversed.length !== currentMsgs.length ||
            (reversed.length > 0 &&
              currentMsgs.length > 0 &&
              reversed[reversed.length - 1].id !== currentMsgs[currentMsgs.length - 1].id)
          ) {
            setMessages(reversed);
            scrollToBottom();
            // Automatically mark read
            markChatAsRead(activeChatId).catch((err) => console.error('Failed to mark read:', err));
          }
        })
        .catch((err) => console.error('Polling error:', err));

      // Also update chats list to fetch preview messages
      listDirectChats(1, 30)
        .then((res) => {
          setChats(res.items);
        })
        .catch((err) => console.error('Chats polling error:', err));
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChatId]);

  // 5. Debounced User Search for starting new chats
  useEffect(() => {
    if (!showNewChatModal) return;

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
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc trò chuyện: ' + err.message);
    }
  };

  // Handle Send Text Message
  const handleSendMessage = async () => {
    if (activeChatId === null || !draftMessage.trim() || isSending) return;

    const messageText = draftMessage;
    setDraftMessage('');
    setIsSending(true);

    try {
      const newMsg = await sendChatMessage(activeChatId, messageText);
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();
      loadChats();
    } catch (err: any) {
      setDraftMessage(messageText); // restore draft
      Alert.alert('Lỗi', 'Gửi tin nhắn thất bại: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Select & Upload Image
  const handleSelectImage = async () => {
    if (activeChatId === null || isUploading) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để gửi hình ảnh.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const selectedUri = pickerResult.assets[0].uri;
      setIsUploading(true);

      const uploadRes = await uploadChatMedia(selectedUri);

      // Send chat message with uploaded media URL
      const newMsg = await sendChatMessage(activeChatId, undefined, uploadRes.url);
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();
      loadChats();
    } catch (err: any) {
      Alert.alert('Lỗi', 'Gửi hình ảnh thất bại: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered Chats
  const normalizedSearchQuery = inboxSearchQuery.trim().toLowerCase();
  const filteredChats = chats.filter((chat) => {
    if (!normalizedSearchQuery) return true;
    return (
      chat.participant.full_name.toLowerCase().includes(normalizedSearchQuery) ||
      (chat.latest_message?.content && chat.latest_message.content.toLowerCase().includes(normalizedSearchQuery))
    );
  });

  // Map backend model list items to components
  const mappedInboxThreads: InboxListItemData[] = filteredChats.map((chat) => {
    const initials = getInitials(chat.participant);
    let preview = 'Chưa có tin nhắn';
    if (chat.latest_message) {
      preview = chat.latest_message.content || '[Hình ảnh]';
    }
    return {
      id: chat.chat_id.toString(),
      name: chat.participant.full_name,
      preview: preview,
      time: chat.latest_message ? formatTime(chat.latest_message.created_at) : formatTime(chat.updated_at),
      initials: initials,
      bio: chat.participant.bio || undefined,
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
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
    };
  });

  // Profile details items list
  const profileDetails: ProfilePanelStatData[] = activeParticipant
    ? [
      { label: 'Vai trò', value: activeParticipant.bio ? 'Thành viên chính thức' : 'Người dùng mạng xã hội' },
      { label: 'User ID', value: activeParticipant.id.toString() },
      { label: 'Tài khoản', value: 'Công khai' },
    ]
    : [];

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
      contentClassName="min-h-0 flex-1"
      headerAction={newChatButton}>
      <SearchInput onChangeText={setInboxSearchQuery} placeholder="Tìm kiếm hội thoại..." value={inboxSearchQuery} />

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
    if (activeChatId === null || !activeParticipant) {
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



    const initials = getInitials(activeParticipant);
    const getAbsoluteAvatarUrl = (url: string | null) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${API_URL}${url}`;
    };

    return (
      <ThemedView className={`${surfaceClass} flex-1 h-full min-h-[350px] bg-[#FCFDFE] p-3`}>
        {/* Header tinh gọn ở phía trên */}
        <View className="flex-row items-center gap-3 pb-3 mb-2 border-b border-slate-100">
          {/* Nút Back - Chỉ hiển thị trên mobile/tablet */}
          {!useViewportLayout && (
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-[12px] bg-slate-100 active:opacity-80"
              onPress={() => setActiveChatId(null)}>
              <MaterialIcons color="#475569" name="arrow-back" size={20} />
            </Pressable>
          )}

          {/* Avatar & Tên người nhắn (Ấn vào để mở profile) */}
          <Pressable
            className="flex-row items-center gap-2.5 active:opacity-80 flex-1"
            onPress={() => {
              router.push(`/profile/${activeParticipant.id}`);
            }}>
            {activeParticipant.avatar_url ? (
              <Image
                source={{ uri: getAbsoluteAvatarUrl(activeParticipant.avatar_url)! }}
                className="h-9 w-9 rounded-[12px] bg-slate-200 border border-slate-200"
              />
            ) : (
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#DBEAFE]">
                <ThemedText className="text-xs font-semibold text-slate-900">{initials}</ThemedText>
              </View>
            )}
            <View className="flex-1">
              <ThemedText className="text-[15px] font-bold text-slate-900 truncate">
                {activeParticipant.full_name}
              </ThemedText>
              <ThemedText className="text-[11px] text-slate-400 mt-0.5">
                Đang hoạt động
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Phần danh sách tin nhắn chiếm trọn không gian */}
        <View className="min-h-0 flex-1 rounded-[24px] bg-[#FCFDFE] px-2 py-2 border border-slate-100">
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
                <MessageBubble key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Thanh nhập tin nhắn siêu tối giản - Đã bỏ nút Back và Info dưới thanh nhập */}
        <View className="flex-row items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-2 py-1.5 mt-2">
          {/* Nút Chọn Ảnh */}
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-[12px] bg-white border border-slate-200 active:opacity-80 shadow-sm"
            disabled={isUploading}
            onPress={handleSelectImage}>
            {isUploading ? (
              <ActivityIndicator color="#4A9FD8" size="small" />
            ) : (
              <MaterialIcons color="#475569" name="image" size={18} />
            )}
          </Pressable>

          {/* Ô Nhập Tin Nhắn */}
          <TextInput
            className="flex-1 max-h-[60px] min-h-[36px] text-[15px] leading-5 text-slate-900 px-3 py-1.5 bg-white rounded-[12px] border border-slate-200"
            cursorColor="#4A9FD8"
            multiline
            onChangeText={setDraftMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94A3B8"
            selectionColor="rgba(74, 159, 216, 0.24)"
            textAlignVertical="center"
            underlineColorAndroid="transparent"
            value={draftMessage}
          />

          {/* Nút Gửi (Send) */}
          <Pressable
            className={`h-9 w-9 items-center justify-center rounded-[12px] ${!draftMessage.trim() || isSending ? 'bg-slate-100 border border-slate-200' : 'bg-[#4A9FD8]'} active:opacity-80 shadow-sm`}
            disabled={isSending || !draftMessage.trim()}
            onPress={handleSendMessage}>
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <MaterialIcons color={!draftMessage.trim() ? '#94A3B8' : '#FFFFFF'} name="send" size={18} />
            )}
          </Pressable>
        </View>
      </ThemedView>
    );
  };

  // Content for Cột 3: Profile Sidebar/Overlay
  const renderProfileSidebar = () => {
    if (!activeParticipant) return null;
    const initials = getInitials(activeParticipant);
    const getAbsoluteAvatarUrl = (url: string | null) => {
      if (!url) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${API_URL}${url}`;
    };

    return (
      <SectionShell
        title="Hồ sơ"
        subtitle="Thông tin người trò chuyện"
        className={useViewportLayout ? 'h-full' : ''}
        contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}>
        <ScrollView className={useViewportLayout ? 'min-h-0 flex-1' : ''} showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-1">
            <View className="overflow-hidden rounded-[24px] bg-[#DBEAFE]">
              <View className="h-[100px] bg-[#BFDBFE]" />
              <View className="px-4 pb-4">
                <View className="-mt-8 items-start">
                  {activeParticipant.avatar_url ? (
                    <Image
                      source={{ uri: getAbsoluteAvatarUrl(activeParticipant.avatar_url)! }}
                      className="h-16 w-16 rounded-[20px] border-2 border-white bg-slate-200"
                    />
                  ) : (
                    <AvatarPill initials={initials} muted />
                  )}
                </View>
                <ThemedText className="mt-4 text-[22px] font-semibold text-slate-950">
                  {activeParticipant.full_name}
                </ThemedText>
                <ThemedText className="mt-2 text-sm leading-6 text-slate-600">
                  {activeParticipant.bio || 'Chưa cập nhật giới thiệu tiểu sử.'}
                </ThemedText>
              </View>
            </View>

            <View className="gap-3">
              <Pressable
                className="flex-row items-center justify-between rounded-[22px] bg-[#F8FAFC] px-4 py-4 active:opacity-90"
                onPress={() => {
                  router.push(`/profile/${activeParticipant.id}`);
                  setShowProfileOverlay(false);
                }}>
                <ThemedText className="text-base font-medium text-slate-900">Xem trang cá nhân</ThemedText>
                <MaterialIcons color="#94A3B8" name="chevron-right" size={20} />
              </Pressable>
            </View>

            <View className="gap-3">
              {profileDetails.map((item) => (
                <ProfilePanelStat key={item.label} item={item} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SectionShell>
    );
  };

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]">
        <ThemedView className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6 flex-1">
          {!useViewportLayout && activeChatId !== null ? null : (
            <AppTopNav
              isTablet={isTablet}
              onSearchChange={setInboxNavSearchQuery}
              searchPlaceholder="Tìm kiếm thư, liên lạc hoặc tệp tin..."
              searchValue={inboxNavSearchQuery}
            />
          )}

          {useViewportLayout ? (
            // Desktop/Web Layout: 3 Columns
            <View
              className="flex-row items-stretch gap-4 mt-4"
              style={{ height: viewportPanelHeight }}>
              <View className="w-[336px]">{renderInboxList()}</View>
              <View className="min-w-0 flex-1">{renderConversation()}</View>
              <View className="w-[248px]">{renderProfileSidebar()}</View>
            </View>
          ) : (
            // Mobile/Tablet Adaptive Layout: Single-view based on active conversation
            <View className="mt-2 flex-1 w-full" style={activeChatId === null ? { height: height - 150 } : undefined}>
              {activeChatId === null ? (
                <View className="w-full h-full">{renderInboxList()}</View>
              ) : (
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={{ flex: 1 }}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
                  <View className="w-full flex-1">{renderConversation()}</View>
                </KeyboardAvoidingView>
              )}
            </View>
          )}
        </ThemedView>
      </ThemedView>

      {/* Mobile Profile Modal Overlay */}
      {!useViewportLayout && activeParticipant && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowProfileOverlay(false)}
          transparent={false}
          visible={showProfileOverlay}>
          <ThemedView className="flex-1 bg-[#F8FAFC] pt-12 px-4">
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100"
                onPress={() => setShowProfileOverlay(false)}>
                <MaterialIcons color="#475569" name="close" size={24} />
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-800">Thông tin trò chuyện</ThemedText>
              <View className="w-10" />
            </View>
            <View className="flex-1 pt-4">{renderProfileSidebar()}</View>
          </ThemedView>
        </Modal>
      )}

      {/* NEW CHAT MODAL - Allows starting direct chat directly from Inbox */}
      <Modal
        animationType="fade"
        onRequestClose={() => setShowNewChatModal(false)}
        transparent={true}
        visible={showNewChatModal}>
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <ThemedView className="w-full max-w-[500px] rounded-[32px] bg-white p-6 shadow-2xl">
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
              <ThemedText className="text-lg font-bold text-slate-900">Trò chuyện mới</ThemedText>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-80"
                onPress={() => {
                  setShowNewChatModal(false);
                  setNewChatSearchQuery('');
                  setNewChatSearchResults([]);
                }}>
                <MaterialIcons color="#475569" name="close" size={18} />
              </Pressable>
            </View>

            <View className="mt-4">
              <SearchInput
                onChangeText={setNewChatSearchQuery}
                placeholder="Tìm tên hoặc email bạn bè..."
                value={newChatSearchQuery}
              />
            </View>

            <ScrollView className="mt-4 max-h-[280px]" showsVerticalScrollIndicator={false}>
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
                  const getAbsoluteAvatarUrl = (url: string | null) => {
                    if (!url) return null;
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    return `${API_URL}${url}`;
                  };

                  return (
                    <Pressable
                      key={user.id}
                      className="flex-row items-center justify-between rounded-[22px] bg-slate-50 hover:bg-slate-100 active:bg-slate-100 px-4 py-3.5 mb-2 transition-colors border border-slate-100"
                      onPress={() => handleStartNewChat(user.id)}>
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
                      <View className="rounded-[14px] bg-[#4A9FD8] px-3.5 py-2">
                        <ThemedText className="text-xs font-semibold text-white">Nhắn tin</ThemedText>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}
