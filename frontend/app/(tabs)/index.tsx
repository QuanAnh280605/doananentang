import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions, RefreshControl } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { fetchFollowingUsers, fetchFeed, listDirectChats } from '@/lib/api';
import type { ChatListItem, FollowUser } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

type Shortcut = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
};

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

const shortcuts: Shortcut[] = [
  { icon: 'home-filled', label: 'Home' },
  { icon: 'bookmark-border', label: 'Saved sets' },
  { icon: 'autorenew', label: 'Circle updates' },
];

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

function ShortcutRow({ item }: { item: Shortcut }) {
  return (
    <View className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
      <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#D9ECF8]">
        <MaterialIcons color="#4A9FD8" name={item.icon} size={22} />
      </View>
      <ThemedText className="text-lg font-medium text-slate-900">{item.label}</ThemedText>
    </View>
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

function ProfileRail({ currentUser }: { currentUser: AuthUser | null }) {
  const initials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'LE';
  const fullName = currentUser
    ? `${currentUser.first_name} ${currentUser.last_name}`
    : 'Lena Evere';
  const bio = currentUser?.bio || 'Leading product design at Northfeed, shaping calmer social tools for creative teams.';

  return (
    <View className="gap-4">
      <ThemedText className="px-1 text-lg font-semibold text-slate-900">Shortcuts</ThemedText>
      {shortcuts.map((item) => (
        <ShortcutRow key={item.label} item={item} />
      ))}

      <ThemedView className={`${surfaceClass} overflow-hidden`}>
        <View className="h-[180px] bg-[#EAF4FB]" />
        <View className="px-5 pb-5">
          <View className="-mt-8 flex-row justify-start">
            <Avatar initials={initials} avatarUrl={currentUser?.avatar_url} />
          </View>

          <ThemedText className="mt-4 text-[28px] font-semibold text-slate-950">{fullName}</ThemedText>
          <ThemedText className="mt-2 text-base leading-7 text-slate-600">
            {bio}
          </ThemedText>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
              <ThemedText className="text-sm text-slate-500">Followers</ThemedText>
              <ThemedText className="mt-1 text-xl font-semibold text-slate-950">2.4k</ThemedText>
            </View>
            <View className="flex-1 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
              <ThemedText className="text-sm text-slate-500">Projects</ThemedText>
              <ThemedText className="mt-1 text-xl font-semibold text-slate-950">14 live</ThemedText>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <Link href="/(tabs)/profile" asChild>
              <Pressable className="flex-1 rounded-[22px] bg-[#0A0A0A] px-4 py-4 active:opacity-90">
                <ThemedText className="text-center text-base font-medium text-white">View profile</ThemedText>
              </Pressable>
            </Link>
            <Pressable className="flex-1 rounded-[22px] bg-[#F7F8FA] px-4 py-4 active:opacity-90">
              <ThemedText className="text-center text-base font-medium text-slate-900">Edit intro</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    </View>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser).catch(() => { });
  }, []);

  const loadPosts = useCallback(async (pageNum = 1, shouldAppend = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const result = await fetchFeed(pageNum, 10);
      if (shouldAppend) {
        setPosts((prev) => [...prev, ...result.items]);
      } else {
        setPosts(result.items);
      }
      setHasMore(result.page < result.total_pages);
      setPage(result.page);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải bài viết');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchFeed(1, 10);
      setPosts(result.items);
      setHasMore(result.page < result.total_pages);
      setPage(result.page);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải bài viết');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true);
    }
  };


  return (
    <ThemedView className="flex-1 bg-[#EDF1F5]">
      <StatusBar style="dark" />
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4A9FD8"
            colors={['#4A9FD8']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="mx-auto w-full max-w-[1720px] px-4 pt-4 md:px-6">
            <AppTopNav
              isTablet={isTablet}
              searchPlaceholder="Search"
              avatarUrl={currentUser?.avatar_url}
              avatarInitials={
                currentUser
                  ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
                  : 'LE'
              }
            />
            <View className={`mt-4 gap-4 ${isDesktop ? 'flex-row items-start' : ''}`}>
              {isDesktop && (
                <View className="w-[350px]">
                  <ProfileRail currentUser={currentUser} />
                </View>
              )}
              <View className={`${isDesktop ? 'flex-1' : 'w-full'} gap-4`}>
                <ComposerCard onPostCreated={() => loadPosts(1, false)} currentUser={currentUser} />
                {/* Stories */}
                <FlatList
                  horizontal
                  data={stories}
                  keyExtractor={(s) => s.id}
                  renderItem={({ item }) => <StoryCard item={item} />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }}
                />
                {/* Loading / Error / Empty */}
                {loading && (
                  <View className="items-center py-12">
                    <ActivityIndicator size="large" color="#4A9FD8" />
                    <ThemedText className="mt-3 text-sm text-slate-500">Đang tải bài viết...</ThemedText>
                  </View>
                )}
                {!loading && error && (
                  <ThemedView className={`${surfaceClass} items-center p-8`}>
                    <MaterialIcons color="#D05B5B" name="error-outline" size={32} />
                    <ThemedText className="mt-3 text-center text-base text-slate-600">{error}</ThemedText>
                    <Pressable
                      onPress={() => loadPosts(1, false)}
                      className="mt-4 rounded-[20px] bg-[#0A0A0A] px-6 py-3 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-medium text-white">Thử lại</ThemedText>
                    </Pressable>
                  </ThemedView>
                )}
                {!loading && !error && posts.length === 0 && (
                  <ThemedView className={`${surfaceClass} items-center p-8`}>
                    <MaterialIcons color="#94A3B8" name="article" size={32} />
                    <ThemedText className="mt-3 text-center text-base text-slate-500">Chưa có bài viết nào</ThemedText>
                  </ThemedView>
                )}
                {/* On desktop show posts inline (FlatList renderItem won't nest) */}
                {(isDesktop || isTablet) && !loading && !error && posts.length > 0 && (
                  <View className="gap-4">
                    {posts.map((post) => (
                      <FeedPost key={String(post.id)} item={post} />
                    ))}
                    {loadingMore && (
                      <View className="items-center py-4">
                        <ActivityIndicator size="small" color="#4A9FD8" />
                      </View>
                    )}
                    {hasMore && !loadingMore && (
                      <Pressable
                        onPress={handleLoadMore}
                        className="items-center justify-center rounded-[20px] bg-[#F7F8FA] py-4 active:opacity-80"
                      >
                        <ThemedText className="text-sm font-medium text-slate-600">Tải thêm</ThemedText>
                      </Pressable>
                    )}
                    {!hasMore && (
                      <View className="py-6 items-center">
                        <ThemedText className="text-sm text-slate-400">Bạn đã xem hết bài viết.</ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {isDesktop && (
                <View className="w-[360px]">
                  <RightRail currentUser={currentUser} />
                </View>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          // On desktop/tablet posts are rendered inline inside ListHeaderComponent
          if (isDesktop || isTablet) return null;
          return (
            <View className="mx-auto w-full max-w-[1720px] px-4">
              <FeedPost item={item} />
            </View>
          );
        }}
        ListFooterComponent={
          !loading && !error && posts.length > 0 ? (
            hasMore ? (
              <View className="mx-auto w-full max-w-[1720px] px-4 md:px-6">
                <View className={isDesktop ? 'ml-[366px] mr-[376px]' : 'w-full'}>
                  <Pressable
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                    className="mt-2 items-center justify-center rounded-[20px] bg-[#F7F8FA] py-4 active:opacity-80"
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#4A9FD8" />
                    ) : (
                      <ThemedText className="text-sm font-medium text-slate-600">Tải thêm</ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="py-6 items-center">
                <ThemedText className="text-sm text-slate-400">Bạn đã xem hết bài viết.</ThemedText>
              </View>
            )
          ) : null
        }
      />
    </ThemedView>
  );
}

