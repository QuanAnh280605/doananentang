import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, fetchPosts, createDirectChat } from '@/lib/api';
import { fetchCurrentUser, fetchFollowStatus, followUser, fetchUserProfile, type FollowStatus, unfollowUser, type AuthUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import type { Post } from '@/lib/types';

type ProfileTab = 'posts' | 'media';

const tabs: { key: ProfileTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'posts', label: 'All', icon: 'grid-view' },
  { key: 'media', label: 'Media', icon: 'photo-library' },
];

function getSingleParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

function buildProfileViewModel(user: AuthUser | null, fallbackName: string, fallbackBio: string): {
  displayName: string;
  initials: string;
  intro: string;
  location: string;
  email: string;
  avatarUrl: string | null;
} {
  if (!user) {
    const displayName = fallbackName;
    const initials = displayName.slice(0, 2).toUpperCase() || 'GP';
    return {
      displayName,
      initials,
      intro: fallbackBio,
      location: '',
      email: '',
      avatarUrl: null,
    };
  }

  const firstName = user.first_name?.trim() || '';
  const lastName = user.last_name?.trim() || '';
  const displayName = `${firstName} ${lastName}`.trim();

  let initials = '';
  if (firstName || lastName) {
    initials = `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  const intro = user.bio || '';
  const location = user.city || '';
  const email = user.email || '';
  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
    : null;
  return {
    displayName,
    initials: initials || 'NA',
    intro,
    location,
    email,
    avatarUrl,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvatarBlock({ initials, soft = false, size = 'large', avatarUrl }: { initials: string; soft?: boolean; size?: 'large' | 'small', avatarUrl?: string | null }) {
  const containerClassName =
    size === 'large'
      ? `h-[92px] w-[92px] rounded-full overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`
      : `h-14 w-14 rounded-full overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`;
  const textClassName = size === 'large' ? 'text-[28px]' : 'text-base';

  return (
    <View className={`items-center justify-center ${containerClassName}`}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <ThemedText className={`${textClassName} font-semibold tracking-[0.5px] text-slate-900`}>{initials}</ThemedText>
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  filled = false,
  onPress,
  disabled = false,
  loading = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  filled?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] px-4 py-[12px] active:opacity-90 ${disabled ? 'opacity-70' : ''} ${filled ? 'bg-[#4A9FD8]' : 'bg-[#F7F8FA]'}`}
    >
      {loading ? (
        <ActivityIndicator color={filled ? '#FFFFFF' : '#0F172A'} size="small" />
      ) : (
        <MaterialIcons color={filled ? '#FFFFFF' : '#0F172A'} name={icon} size={20} />
      )}
      <ThemedText className={`text-base font-semibold ${filled ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
    </Pressable>
  );
}

function ProfileTabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`min-w-[112px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] px-4 py-[12px] active:opacity-90 ${active ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}
      onPress={onPress}
    >
      <MaterialIcons color={active ? '#FFFFFF' : '#0F172A'} name={icon} size={18} />
      <ThemedText className={`text-base font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
    </Pressable>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <ThemedText className="text-[22px] font-semibold text-slate-950">{title}</ThemedText>
        {subtitle ? <ThemedText className="mt-1 text-sm text-slate-500">{subtitle}</ThemedText> : null}
      </View>
      {action}
    </View>
  );
}

function SidebarCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <ThemedView className="bg-white p-5 mb-3.5 shadow-sm rounded-[24px] border border-slate-200/50">
      <SectionTitle title={title} action={action} />
      <View className="mt-5 gap-4">{children}</View>
    </ThemedView>
  );
}

function MediaPanel({ posts, hideHeader }: { posts: Post[]; hideHeader?: boolean }) {
  const mediaItems = (posts || []).flatMap((p) =>
    (p.media || []).map((m) => ({ media: m, post: p }))
  );

  return (
    <ThemedView className={`bg-white mb-3.5 shadow-sm rounded-[24px] border border-slate-200/50 ${hideHeader ? 'p-2 pt-4' : 'p-5'}`}>
      {!hideHeader && <SectionTitle title="Featured media" subtitle="Ảnh và tài liệu đã chia sẻ" />}
      {mediaItems.length === 0 ? (
        <View className="mt-5 items-center py-8">
          <MaterialIcons name="photo-library" size={40} color="#CBD5E1" />
          <ThemedText className="mt-3 text-base font-medium text-slate-700">Chưa có ảnh nào</ThemedText>
          <ThemedText className="mt-1 text-sm text-slate-400">Ảnh chia sẻ sẽ xuất hiện ở đây.</ThemedText>
        </View>
      ) : (
        <View className="mt-5 flex-row flex-wrap -mx-1">
          {mediaItems.map(({ media, post }) => {
            const fileUrl = media.file_url.startsWith('http') ? media.file_url : `${API_URL}${media.file_url}`;
            return (
              <Pressable
                key={media.id}
                className="w-1/3 p-1 active:opacity-80"
                style={{ aspectRatio: 1 }}
                onPress={() => router.push(`/(post)/${post.id}`)}
              >
                <Image
                  source={{ uri: fileUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  contentFit="cover"
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </ThemedView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const postsSectionY = useRef<number>(0);
  const feedY = useRef<number>(0);
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const params = useLocalSearchParams<{ userId?: string; name?: string; initials?: string; preview?: string; bio?: string }>();

  const userId = getSingleParam(params.userId, 'unknown');
  const fallbackName = getSingleParam(params.name, 'Guest profile');
  const fallbackPreview = getSingleParam(params.preview, 'Opened from search results.');
  const fallbackBio = getSingleParam(params.bio, fallbackPreview);

  const numericUserId = useMemo(() => {
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [userId]);

  useEffect(() => {
    if (numericUserId !== null) {
      fetchCurrentUser()
        .then((me) => {
          if (me.id === numericUserId) {
            router.replace('/(tabs)/profile');
          }
        })
        .catch(() => { });
    }
  }, [numericUserId]);

  const [viewedUser, setViewedUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const isWide = width >= 1180;

  // Load viewed user detail
  useEffect(() => {
    if (numericUserId === null) {
      setViewedUser(null);
      return;
    }

    let isActive = true;
    setIsLoadingUser(true);

    fetchUserProfile(numericUserId)
      .then((userProfile) => {
        if (isActive) {
          setViewedUser(userProfile);
        }
      })
      .catch(() => {
        // Fallback to params data on error
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingUser(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [numericUserId]);

  // Load follow status
  useEffect(() => {
    if (numericUserId === null) {
      setFollowStatus(null);
      return;
    }

    let isActive = true;
    setIsLoadingFollowStatus(true);
    setFollowErrorMessage(null);

    fetchFollowStatus(numericUserId)
      .then((status) => {
        if (isActive) {
          setFollowStatus(status);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Cannot load follow status right now.';
        setFollowErrorMessage(message);
        setFollowStatus(null);
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingFollowStatus(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [numericUserId]);

  // Fetch viewed user's posts
  useEffect(() => {
    if (numericUserId === null) return;
    let isActive = true;
    setLoadingPosts(true);

    fetchPosts(1, 20, numericUserId)
      .then((res) => {
        if (isActive) {
          setPosts(res.items);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isActive) setLoadingPosts(false);
      });

    return () => {
      isActive = false;
    };
  }, [numericUserId]);

  const handleFollowToggle = () => {
    if (numericUserId === null || isSubmittingFollow) {
      return;
    }

    setIsSubmittingFollow(true);
    setFollowErrorMessage(null);

    const request = followStatus?.is_following ? unfollowUser(numericUserId) : followUser(numericUserId);
    request
      .then((status) => {
        setFollowStatus(status);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Cannot update follow status right now.';
        setFollowErrorMessage(message);
      })
      .finally(() => {
        setIsSubmittingFollow(false);
      });
  };

  const handleStartChat = async () => {
    if (numericUserId === null || isCreatingChat) {
      return;
    }

    setIsCreatingChat(true);
    try {
      const chat = await createDirectChat(numericUserId);
      router.push({
        pathname: '/inbox',
        params: { openChatId: chat.chat_id.toString() },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể bắt đầu cuộc hội thoại.';
      toast.error(message);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(current => current.filter(p => p.id !== postId));
  };

  const profile = useMemo(() => {
    return buildProfileViewModel(viewedUser, fallbackName, fallbackBio);
  }, [viewedUser, fallbackName, fallbackBio]);

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F1F5F9]" style={{ minHeight: height, paddingTop: insets.top }}>
        <ScrollView ref={scrollViewRef} bounces={false} className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 pb-6 md:px-6 md:pt-6">

            {/* Header / Back */}
            <View className="mx-4 md:mx-0 flex-row items-center gap-3 bg-white shadow-sm rounded-[20px] border border-slate-200/50 px-2 py-2 mt-4 md:mt-0">
              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full bg-[#F7F8FA] active:opacity-80"
              >
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">{profile.displayName}</ThemedText>
              {isLoadingUser && <ActivityIndicator size="small" color="#4A9FD8" className="ml-2" />}
            </View>

            {/* Profile card */}
            <ThemedView className="bg-white shadow-sm overflow-hidden rounded-[24px] border border-slate-200/50">
              <View className="h-[180px] bg-[#D9ECF8] rounded-t-[24px]" />
              <View className="px-5 pb-5">
                <View className="-mt-12 flex-row items-end justify-between gap-4">
                  <View className="flex-row items-end gap-4">
                    <AvatarBlock initials={profile.initials} size="large" avatarUrl={profile.avatarUrl} />
                    <View className="pb-1">
                      <ThemedText className="text-[24px] font-bold text-slate-950">{profile.displayName}</ThemedText>
                    </View>
                  </View>
                </View>

                <View className={`mt-5 gap-5 ${isWide ? 'flex-row items-start justify-between' : ''}`}>
                  <View className={isWide ? 'max-w-[760px] flex-1' : ''}>
                    {profile.intro ? (
                      <ThemedText className="mt-1 text-[16px] leading-7 text-slate-600">
                        {profile.intro}
                      </ThemedText>
                    ) : null}
                    <View className="mt-4 flex-row flex-wrap gap-5">
                      {followStatus ? (
                        <>
                          <Pressable
                            className="flex-row items-center gap-1.5 active:opacity-70"
                            onPress={() => router.push({ pathname: '/profile/follows', params: { userId, type: 'followers' } })}
                          >
                            <ThemedText className="text-[15px] font-bold text-slate-950">{followStatus.followers_count}</ThemedText>
                            <ThemedText className="text-[15px] text-slate-500">người theo dõi</ThemedText>
                          </Pressable>
                          <Pressable
                            className="flex-row items-center gap-1.5 active:opacity-70"
                            onPress={() => router.push({ pathname: '/profile/follows', params: { userId, type: 'following' } })}
                          >
                            <ThemedText className="text-[15px] font-bold text-slate-950">{followStatus.following_count}</ThemedText>
                            <ThemedText className="text-[15px] text-slate-500">đang theo dõi</ThemedText>
                          </Pressable>
                        </>
                      ) : null}
                      <Pressable
                        className="flex-row items-center gap-1.5 active:opacity-70"
                        onPress={() => {
                          if (activeTab !== 'posts') {
                            setActiveTab('posts');
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({ y: postsSectionY.current + feedY.current, animated: true });
                            }, 100);
                          } else {
                            scrollViewRef.current?.scrollTo({ y: postsSectionY.current + feedY.current, animated: true });
                          }
                        }}
                      >
                        <ThemedText className="text-[15px] font-bold text-slate-950">{posts?.length || 0}</ThemedText>
                        <ThemedText className="text-[15px] text-slate-500">bài viết</ThemedText>
                      </Pressable>
                    </View>
                  </View>

                  <View className={`${isWide ? 'w-[360px]' : ''} gap-3`}>
                    <View className="flex-row flex-wrap gap-3">
                      <ActionButton
                        icon={followStatus?.is_following ? 'person-remove' : 'person-add'}
                        label={isLoadingFollowStatus || isSubmittingFollow ? 'Đang xử lý...' : followStatus?.is_following ? 'Đang theo dõi' : 'Theo dõi'}
                        filled={!followStatus?.is_following}
                        onPress={handleFollowToggle}
                        disabled={numericUserId === null || isLoadingFollowStatus || isSubmittingFollow}
                        loading={isSubmittingFollow}
                      />
                      <ActionButton
                        icon="chat-bubble-outline"
                        label="Nhắn tin"
                        onPress={handleStartChat}
                        disabled={numericUserId === null || isCreatingChat}
                        loading={isCreatingChat}
                      />
                    </View>
                    {followErrorMessage ? <ThemedText className="mt-2 text-sm text-rose-600 text-center">{followErrorMessage}</ThemedText> : null}
                  </View>
                </View>

                <View className="mt-6 flex-row flex-wrap gap-3">
                  {tabs.map((tab) => (
                    <ProfileTabButton
                      key={tab.key}
                      active={activeTab === tab.key}
                      icon={tab.icon}
                      label={tab.label}
                      onPress={() => setActiveTab(tab.key)}
                    />
                  ))}
                </View>
              </View>
            </ThemedView>

            {/* Body: sidebar + main */}
            <View
              className={isWide ? 'flex-row items-start gap-4' : 'gap-4'}
              onLayout={(e) => postsSectionY.current = e.nativeEvent.layout.y}
            >
              {/* Sidebar */}
              {activeTab !== 'media' && (
                <View className={isWide ? 'w-[320px] gap-4' : 'gap-4'}>
                  <SidebarCard title="Giới thiệu">
                    <View className="gap-3">
                      {[
                        { icon: 'mail-outline' as const, value: profile.email },
                        { icon: 'location-on' as const, value: profile.location },
                      ]
                        .filter((item) => !!item.value)
                        .map((item) => (
                          <View key={item.icon} className="flex-row items-center gap-3">
                            <View className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                              <MaterialIcons name={item.icon} size={20} color="#64748B" />
                            </View>
                            <View className="flex-1 flex-row items-center gap-2">
                              <ThemedText className="text-base font-medium text-slate-800" numberOfLines={1}>
                                {item.value}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                      {!profile.email && !profile.location && (
                        <ThemedText className="text-base italic text-slate-400">
                          Chưa có thông tin.
                        </ThemedText>
                      )}
                    </View>
                  </SidebarCard>
                </View>
              )}

              {/* Main content area */}
              <View className={isWide ? 'min-w-0 flex-1 gap-4' : 'gap-4'}>
                {activeTab === 'posts' ? (
                  <View className="gap-4">
                    <MediaPanel posts={posts} />
                    <ThemedText
                      onLayout={(e) => feedY.current = e.nativeEvent.layout.y}
                      className="px-1 text-[26px] font-semibold text-slate-950"
                    >
                      Tất cả bài viết
                    </ThemedText>
                    {loadingPosts ? (
                      <View className="items-center py-8">
                        <ActivityIndicator size="large" color="#4A9FD8" />
                        <ThemedText className="mt-3 text-sm text-slate-500">Đang tải bài viết...</ThemedText>
                      </View>
                    ) : posts.length === 0 ? (
                      <ThemedView className="bg-white shadow-sm rounded-[24px] border border-slate-200/50 items-center py-10">
                        <MaterialIcons name="article" size={40} color="#CBD5E1" />
                        <ThemedText className="mt-3 text-[20px] font-semibold text-slate-700">Chưa có bài viết</ThemedText>
                      </ThemedView>
                    ) : (
                      posts.map((post) => (
                        <FeedPost key={post.id} item={post} onDeleteSuccess={() => handleDeletePost(post.id)} />
                      ))
                    )}
                  </View>
                ) : null}

                {activeTab === 'media' ? (
                  <MediaPanel posts={posts} hideHeader />
                ) : null}
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}
