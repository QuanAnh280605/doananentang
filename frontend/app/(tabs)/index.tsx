import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { fetchFollowingUsers, fetchPosts, listDirectChats } from '@/lib/api';
import type { ChatListItem, FollowUser } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';


type Story = {
  id: string;
  title: string;
  time: string;
  fill: string;
  initials: string;
};



type Contact = {
  id: number;
  name: string;
  status: string;
  initials: string;
  bio: string;
  avatarUrl: string | null;
};

type InboxItem = {
  id: number;
  participantId: number;
  name: string;
  message: string;
  initials: string;
  bio: string;
  avatarUrl: string | null;
};


const stories: Story[] = [
  { id: '1', title: 'Morning run club', time: '2h ago', fill: 'bg-[#66D575]', initials: 'MN' },
  { id: '2', title: 'Desk setup refresh', time: '5h ago', fill: 'bg-[#874FFF]', initials: 'DS' },
  { id: '3', title: 'Client moodboard', time: 'Yesterday', fill: 'bg-[#F24822]', initials: 'KM' },
];



function buildInitials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'US';
}

function mapFollowUserToContact(user: FollowUser): Contact {
  return {
    id: user.id,
    name: user.full_name,
    status: user.bio?.trim() || 'Đang theo dõi',
    initials: buildInitials(user.first_name, user.last_name),
    bio: user.bio?.trim() || 'Người dùng đang được bạn theo dõi.',
    avatarUrl: user.avatar_url,
  };
}

function mapChatToInboxItem(thread: ChatListItem): InboxItem {
  return {
    id: thread.chat_id,
    participantId: thread.participant.id,
    name: thread.participant.full_name,
    message: thread.latest_message?.content || 'Chưa có tin nhắn',
    initials: buildInitials(thread.participant.first_name, thread.participant.last_name),
    bio: thread.participant.bio?.trim() || 'Hội thoại trực tiếp',
    avatarUrl: thread.participant.avatar_url,
  };
}
function SectionCard({ title, rightLabel, children }: { title: string; rightLabel?: string; children: React.ReactNode }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <View className="flex-row items-center justify-between gap-3">
        <ThemedText className="text-[22px] font-semibold text-slate-950">{title}</ThemedText>
        {rightLabel ? <ThemedText className="text-sm text-slate-500">{rightLabel}</ThemedText> : null}
      </View>
      <View className="mt-4 gap-3">{children}</View>
    </ThemedView>
  );
}


function StoryCard({ item }: { item: Story }) {
  return (
    <View className={`${item.fill} mr-4 w-[180px] overflow-hidden rounded-[28px] p-5`}>
      <Avatar initials={item.initials} />
      <View className="mt-24 gap-1">
        <ThemedText className="text-lg font-semibold text-white">{item.title}</ThemedText>
        <ThemedText className="text-sm text-white/80">{item.time}</ThemedText>
      </View>
    </View>
  );
}





function ContactRow({ item }: { item: Contact }) {
  return (
    <Link
      asChild
      href={{
        pathname: '/profile/[userId]',
        params: {
          userId: item.id,
          name: item.name,
          initials: item.initials,
          preview: item.status,
          bio: item.bio,
        },
      }}>
      <Pressable className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 active:opacity-90">
        <Avatar initials={item.initials} avatarUrl={item.avatarUrl} soft />
        <View className="flex-1">
          <ThemedText className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
          <ThemedText className="text-sm text-slate-500">{item.status}</ThemedText>
        </View>
        <View className="h-3 w-3 rounded-full bg-[#6FC18A]" />
      </Pressable>
    </Link>
  );
}

function MessengerRow({ item }: { item: InboxItem }) {
  return (
    <Link
      asChild
      href={{
        pathname: '/profile/[userId]',
        params: {
          userId: item.participantId,
          name: item.name,
          initials: item.initials,
          preview: item.message,
          bio: item.bio,
        },
      }}>
      <Pressable className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 active:opacity-90">
        <Avatar initials={item.initials} avatarUrl={item.avatarUrl} soft />
        <View className="flex-1 gap-1">
          <ThemedText className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
          <ThemedText className="text-sm text-slate-500">{item.message}</ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}


function RightRail({ currentUser }: { currentUser: AuthUser | null }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      setContacts([]);
      setInboxItems([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    setError(null);

    Promise.all([
      fetchFollowingUsers(currentUser.id, 1, 4),
      listDirectChats(),
    ])
      .then(([followingResponse, chatThreads]) => {
        if (!isMounted) return;
        setContacts(followingResponse.items.map(mapFollowUserToContact));
        setInboxItems(chatThreads.slice(0, 3).map(mapChatToInboxItem));
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu liên hệ');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <View className="gap-4">
      <SectionCard title="Contacts" rightLabel={loading ? 'Loading' : `${contacts.length} following`}>
        {loading ? (
          <ThemedText className="text-sm text-slate-500">Đang tải liên hệ...</ThemedText>
        ) : error ? (
          <ThemedText className="text-sm text-[#D05B5B]">{error}</ThemedText>
        ) : contacts.length === 0 ? (
          <ThemedText className="text-sm text-slate-500">Bạn chưa theo dõi ai.</ThemedText>
        ) : (
          contacts.map((item) => (
            <ContactRow key={item.id} item={item} />
          ))
        )}
      </SectionCard>

      <SectionCard title="Messenger" rightLabel={loading ? 'Loading' : `${inboxItems.length} threads`}>
        {loading ? (
          <ThemedText className="text-sm text-slate-500">Đang tải hội thoại...</ThemedText>
        ) : error ? (
          <ThemedText className="text-sm text-[#D05B5B]">{error}</ThemedText>
        ) : inboxItems.length === 0 ? (
          <ThemedText className="text-sm text-slate-500">Chưa có hội thoại nào.</ThemedText>
        ) : (
          inboxItems.map((item) => (
            <MessengerRow key={item.id} item={item} />
          ))
        )}

        <Link asChild href="/(tabs)/inbox">
          <Pressable className="mt-2 rounded-[22px] bg-[#0A0A0A] px-5 py-4 active:opacity-90">
            <ThemedText className="text-center text-base font-medium text-white">Open inbox</ThemedText>
          </Pressable>
        </Link>
      </SectionCard>
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1380;
  const isTablet = width >= 960;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser).catch(() => { });
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPosts(1, 20);
      setPosts(result.items);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải bài viết');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <ThemedView className="flex-1 bg-[#EDF1F5]">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav isTablet={isTablet} searchPlaceholder="Search" avatarUrl={currentUser?.avatar_url}
            avatarInitials={currentUser ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() : 'LE'}
          />

          <View className={`mt-4 gap-4 ${isDesktop ? 'flex-row justify-center items-start' : ''}`}>
            <View className={`${isDesktop ? 'w-[680px]' : 'w-full'} gap-4`}>
              <ComposerCard onPostCreated={loadPosts} currentUser={currentUser} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="pr-4">
                {stories.map((item) => (
                  <StoryCard key={item.id} item={item} />
                ))}
              </ScrollView>

              {/* Trạng thái loading / error / danh sách bài viết */}
              {loading ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color="#4A9FD8" />
                  <ThemedText className="mt-3 text-sm text-slate-500">Đang tải bài viết...</ThemedText>
                </View>
              ) : error ? (
                <ThemedView className={`${surfaceClass} items-center p-8`}>
                  <MaterialIcons color="#D05B5B" name="error-outline" size={32} />
                  <ThemedText className="mt-3 text-center text-base text-slate-600">{error}</ThemedText>
                  <Pressable onPress={loadPosts} className="mt-4 rounded-[20px] bg-[#0A0A0A] px-6 py-3 active:opacity-80">
                    <ThemedText className="text-sm font-medium text-white">Thử lại</ThemedText>
                  </Pressable>
                </ThemedView>
              ) : posts.length === 0 ? (
                <ThemedView className={`${surfaceClass} items-center p-8`}>
                  <MaterialIcons color="#94A3B8" name="article" size={32} />
                  <ThemedText className="mt-3 text-center text-base text-slate-500">Chưa có bài viết nào</ThemedText>
                </ThemedView>
              ) : (
                posts.map((item) => (
                  <FeedPost key={String(item.id)} item={item} />
                ))
              )}
            </View>

            {isDesktop && (
              <View className="w-[360px]">
                <RightRail currentUser={currentUser} />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
