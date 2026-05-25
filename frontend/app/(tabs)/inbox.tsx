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
  API_URL,
} from '@/lib/api';
import { fetchCurrentUser, type AuthUser } from '@/lib/auth';
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
  const getInitials = (participant: ChatParticipant | null): string => {
    if (!participant) return '??';
    const first = participant.first_name ? participant.first_name[0] : '';
    const last = participant.last_name ? participant.last_name[0] : '';
    return (first + last).toUpperCase() || participant.full_name.slice(0, 2).toUpperCase();
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
      
      // Update preview in list
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

  // Content for Cột 1: Inbox List
  const renderInboxList = () => (
    <SectionShell
      title="Hộp thư"
      subtitle="Các cuộc trò chuyện gần đây"
      className={useViewportLayout ? 'h-full' : ''}
      contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}>
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
          <View className="py-8 items-center">
            <ThemedText className="text-slate-400 text-sm">Không tìm thấy cuộc trò chuyện nào.</ThemedText>
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
          <MaterialIcons color="#94A3B8" name="forum" size={48} />
          <ThemedText className="mt-4 text-lg font-semibold text-slate-800">
            Chưa chọn cuộc hội thoại nào
          </ThemedText>
          <ThemedText className="mt-2 text-sm text-slate-500 text-center">
            Hãy chọn một cuộc hội thoại ở danh sách bên trái hoặc nhắn tin từ trang cá nhân của bạn bè.
          </ThemedText>
        </ThemedView>
      );
    }

    const initials = getInitials(activeParticipant);
    const backButton = !useViewportLayout ? (
      <Pressable
        className="mr-3 h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 active:opacity-90"
        onPress={() => setActiveChatId(null)}>
        <MaterialIcons color="#475569" name="arrow-back" size={20} />
      </Pressable>
    ) : null;

    const infoButton = !useViewportLayout ? (
      <Pressable
        className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 active:opacity-90"
        onPress={() => setShowProfileOverlay(true)}>
        <MaterialIcons color="#475569" name="info-outline" size={20} />
      </Pressable>
    ) : null;

    return (
      <SectionShell
        title="Trò chuyện"
        subtitle={`${activeParticipant.full_name}`}
        className={useViewportLayout ? 'h-full' : ''}
        contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}
        headerAction={infoButton}>
        <View className="flex-row items-center justify-between gap-3 rounded-[24px] bg-[#F8FAFC] px-4 py-4">
          <View className="flex-row items-center gap-3 flex-1">
            {backButton}
            <AvatarPill initials={initials} />
            <View className="flex-1">
              <ThemedText className="text-base font-semibold text-slate-950 truncate">
                {activeParticipant.full_name}
              </ThemedText>
              <ThemedText className="text-sm text-slate-500">
                Đang trực tuyến
              </ThemedText>
            </View>
          </View>
        </View>

        <View className={`min-h-0 flex-1 rounded-[28px] bg-[#FCFDFE] px-4 py-4 border border-slate-100 ${useViewportLayout ? '' : 'min-h-[420px]'}`}>
          {isLoadingMessages ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator color="#4A9FD8" size="large" />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              className="min-h-0 flex-1"
              contentContainerClassName="gap-4"
              onContentSizeChange={scrollToBottom}
              showsVerticalScrollIndicator={false}>
              {mappedMessages.map((item) => (
                <MessageBubble key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 mt-2">
          <TextInput
            className="min-h-[50px] text-base leading-6 text-slate-900"
            cursorColor="#0F172A"
            multiline
            onChangeText={setDraftMessage}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#64748B"
            selectionColor="rgba(15, 23, 42, 0.24)"
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            value={draftMessage}
          />
          <View className="mt-4 flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <View className="flex-row items-center gap-2">
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-[18px] bg-white border border-slate-100 active:opacity-90"
                disabled={isUploading}
                onPress={handleSelectImage}>
                {isUploading ? (
                  <ActivityIndicator color="#4A9FD8" size="small" />
                ) : (
                  <MaterialIcons color="#475569" name="image" size={20} />
                )}
              </Pressable>
            </View>
            <Pressable
              className="rounded-[18px] bg-slate-900 px-5 py-3 active:opacity-90 flex-row items-center"
              disabled={isSending || !draftMessage.trim()}
              onPress={handleSendMessage}>
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 6 }} />
              ) : null}
              <ThemedText className="text-sm font-semibold text-white">Gửi</ThemedText>
            </Pressable>
          </View>
        </View>
      </SectionShell>
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
        <ThemedView className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav
            isTablet={isTablet}
            onSearchChange={setInboxNavSearchQuery}
            searchPlaceholder="Tìm kiếm thư, liên lạc hoặc tệp tin..."
            searchValue={inboxNavSearchQuery}
          />

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
            <View className="mt-4 gap-5">
              {activeChatId === null ? (
                <View className="w-full">{renderInboxList()}</View>
              ) : (
                <View className="w-full">{renderConversation()}</View>
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
    </>
  );
}
