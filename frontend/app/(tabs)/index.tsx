import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions, RefreshControl, Image, DeviceEventEmitter } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ComposerCard } from '@/components/post/ComposerCard';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { fetchFollowingUsers, fetchFeedPosts, listDirectChats } from '@/lib/api';
import type { ChatListItem, FollowUser } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';


type Story = {
  id: string;
  authorName: string;
  mediaUrl: string;
  initials: string;
  avatarUrl?: string | null;
  ringColor?: string;
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
  { id: '1', authorName: 'Lena Evere', mediaUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80', initials: 'LE', ringColor: '#4A9FD8' },
  { id: '2', authorName: 'Alex Chen', mediaUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80', initials: 'AC', ringColor: '#41A36D' },
  { id: '3', authorName: 'Sarah Kim', mediaUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80', initials: 'SK', ringColor: '#F59E0B' },
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


function StoryStrip({ currentUser }: { currentUser: AuthUser | null }) {
  const initials = buildInitials(currentUser?.first_name, currentUser?.last_name);
  const userAvatarUrl = currentUser?.avatar_url
    ? currentUser.avatar_url.startsWith('http')
      ? currentUser.avatar_url
      : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}${currentUser.avatar_url}`
    : null;

  return (
    <ThemedView className={`${surfaceClass} p-4 shadow-sm`}>
      <View className="mb-4 flex-row items-center justify-between px-1">
        <View>
          <ThemedText className="text-[22px] font-bold text-slate-900 tracking-tight">
            Tin
          </ThemedText>
          <ThemedText className="text-[13px] font-medium text-slate-500">
            Xem nhanh khoảnh khắc từ bạn bè
          </ThemedText>
        </View>
        <Pressable className="rounded-[18px] px-4 py-2 bg-[#EAF4FB] active:opacity-80">
          <ThemedText className="text-[14px] font-bold text-[#4A9FD8]">
            Tạo tin
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={stories}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingRight: 4 }}
        ListHeaderComponent={
          <Pressable className="mr-3 h-[216px] w-[124px] overflow-hidden rounded-[24px] border border-[#E4E8EE] bg-[#F7F8FA] active:opacity-90">
            <View className="h-[142px] bg-[#EAF4FB] items-center justify-center">
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <ThemedText className="text-[28px] font-bold text-[#4A9FD8]">{initials}</ThemedText>
              )}
            </View>
            <View className="absolute left-1/2 top-[120px] ml-[-22px] h-[44px] w-[44px] items-center justify-center rounded-full border-[4px] border-[#FFFFFF] bg-[#4A9FD8]">
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
            </View>
            <View className="mt-8 items-center px-2">
              <ThemedText className="text-[14px] font-bold text-slate-900 text-center">Tạo tin</ThemedText>
            </View>
          </Pressable>
        }
        renderItem={({ item }) => {
          const avatarUri = item.avatarUrl
            ? item.avatarUrl.startsWith('http')
              ? item.avatarUrl
              : `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}${item.avatarUrl}`
            : null;
          return (
            <Pressable className="mr-3 h-[216px] w-[124px] overflow-hidden rounded-[24px] bg-slate-900 active:opacity-90">
              <Image source={{ uri: item.mediaUrl }} className="absolute h-full w-full opacity-90" resizeMode="cover" />
              {/* Overlay for text readability */}
              <View className="absolute bottom-0 left-0 right-0 h-28" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} />
              
              {/* Avatar */}
              <View className="absolute left-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white border-2" style={{ borderColor: item.ringColor || '#E4E8EE' }}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF4FB', alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: item.ringColor || '#4A9FD8' }}>{item.initials}</ThemedText>
                  </View>
                )}
              </View>
              
              {/* Name */}
              <View className="absolute bottom-4 left-3 right-3">
                <ThemedText className="text-[14px] font-bold text-white leading-tight" numberOfLines={2}>
                  {item.authorName}
                </ThemedText>
              </View>
            </Pressable>
          );
        }}
      />
    </ThemedView>
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
      const result = await fetchFeedPosts(pageNum, 10);
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
    const updateSub = DeviceEventEmitter.addListener('postUpdated', (data) => {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(data.postId)
            ? {
              ...p,
              is_liked: data.is_liked,
              like_count: data.like_count,
              comment_count: data.comment_count,
              user_reaction: data.reaction_type ?? p.user_reaction,
            }
            : p
        )
      );
    });

    const deleteSub = DeviceEventEmitter.addListener('postDeleted', (data) => {
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(data.postId)));
    });

    return () => {
      updateSub.remove();
      deleteSub.remove();
    };
  }, []);

  useEffect(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await fetchFeedPosts(1, 10);
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
              <View className={`${isDesktop ? 'flex-1' : 'w-full'} gap-4`}>
                <ComposerCard onPostCreated={() => loadPosts(1, false)} currentUser={currentUser} />
                {/* Stories */}
                <StoryStrip currentUser={currentUser} />
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

