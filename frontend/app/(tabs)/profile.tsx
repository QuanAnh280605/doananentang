import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, fetchPosts } from '@/lib/api';
import { fetchCurrentUser, fetchFollowStatus } from '@/lib/auth';
import type { AuthUser, FollowStatus } from '@/lib/auth';
import type { Post, VisibilityLevel } from '@/lib/types';

type ProfileTab = 'posts' | 'media';

type MediaSpotlight = {
  id: string;
  title: string;
  subtitle: string;
  fillClassName: string;
};

type ProfileViewModel = {
  displayName: string;
  initials: string;
  intro: string;
  location: string;
  locationPrivacy: VisibilityLevel;
  email: string;
  emailPrivacy: VisibilityLevel;
  phone: string;
  contactPrivacy: VisibilityLevel;
  avatarUrl: string | null;
};

const surfaceClass = 'rounded-[32px] border border-app-border bg-app-surface';
const mutedSurfaceClass = 'rounded-[32px] bg-[#F7F8FA]';

const tabs: { key: ProfileTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'posts', label: 'All', icon: 'grid-view' },
  { key: 'media', label: 'Media', icon: 'photo-library' },
];



function buildProfileViewModel(user: AuthUser | null): ProfileViewModel {
  const firstName = user?.first_name?.trim() || '';
  const lastName = user?.last_name?.trim() || '';
  const displayName = `${firstName} ${lastName}`.trim();

  let initials = '';
  if (firstName || lastName) {
    initials = `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  const intro = user?.bio || '';
  const location = user?.city || '';
  const email = user?.email || '';
  const phone = user?.phone || '';

  const locationPrivacy = user?.location_privacy || 'public';
  const emailPrivacy = user?.email_privacy || 'public';
  const contactPrivacy = user?.contact_privacy || 'public';

  const avatarUrl = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
    : null;
  return {
    displayName,
    initials: initials || 'NA',
    intro,
    location,
    locationPrivacy,
    email,
    emailPrivacy,
    phone,
    contactPrivacy,
    avatarUrl,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvatarBlock({
  initials,
  soft = false,
  size = 'large',
  avatarUrl,
  onPress,
  showPickerHint = false,
}: {
  initials: string;
  soft?: boolean;
  size?: 'large' | 'small';
  avatarUrl?: string | null;
  onPress?: () => void;
  showPickerHint?: boolean;
}) {
  const containerClassName =
    size === 'large'
      ? `h-[92px] w-[92px] rounded-full overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`
      : `h-14 w-14 rounded-full overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`;
  const textClassName = size === 'large' ? 'text-[28px]' : 'text-base';

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityLabel="Ảnh đại diện"
      accessibilityHint="Nhấn để thay đổi ảnh đại diện"
      className="relative"
    >
      <View className={`items-center justify-center ${containerClassName}`}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <ThemedText className={`${textClassName} font-semibold tracking-[0.5px] text-slate-900`}>{initials}</ThemedText>
        )}
        {/* Camera overlay khi picker mode bật */}
        {showPickerHint && size === 'large' && (
          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
            <MaterialIcons name="camera-alt" size={28} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  filled = false,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  filled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-4 py-[14px] active:opacity-90 ${filled ? 'bg-[#4A9FD8]' : 'bg-[#F7F8FA]'}`}
    >
      <MaterialIcons color={filled ? '#FFFFFF' : '#0F172A'} name={icon} size={20} />
      <ThemedText className={`text-base font-medium ${filled ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
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
      className={`min-w-[112px] flex-1 flex-row items-center justify-center gap-2 rounded-full px-4 py-[14px] active:opacity-90 ${active ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}
      onPress={onPress}
    >
      <MaterialIcons color={active ? '#FFFFFF' : '#0F172A'} name={icon} size={18} />
      <ThemedText className={`text-base font-medium ${active ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
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
    <ThemedView className="bg-white p-5 mb-2 shadow-sm md:rounded-[32px] md:border md:border-[#E4E8EE]">
      <SectionTitle title={title} action={action} />
      <View className="mt-5 gap-4">{children}</View>
    </ThemedView>
  );
}

// Banner thông báo thành công sau khi lưu inline intro
function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-[24px] bg-[#DCFCE7] px-4 py-3 mx-4 md:mx-0">
      <View className="flex-row items-center gap-2">
        <MaterialIcons name="check-circle" size={18} color="#16A34A" />
        <ThemedText className="text-sm font-medium text-[#15803D]">{message}</ThemedText>
      </View>
      <Pressable onPress={onDismiss} className="h-8 w-8 items-center justify-center" accessibilityLabel="Đóng">
        <MaterialIcons name="close" size={16} color="#15803D" />
      </Pressable>
    </View>
  );
}

function MediaPanel({ posts, hideHeader }: { posts: Post[]; hideHeader?: boolean }) {
  const mediaItems = (posts || []).flatMap((p) =>
    (p.media || []).map((m) => ({ media: m, post: p }))
  );

  return (
    <ThemedView className={`bg-white mb-2 shadow-sm md:rounded-[32px] md:border md:border-[#E4E8EE] ${hideHeader ? 'p-2 pt-4' : 'p-5'}`}>
      {!hideHeader && <SectionTitle title="Featured media" subtitle="Ảnh và tài liệu đã chia sẻ" />}
      {mediaItems.length === 0 ? (
        <View className="mt-5 items-center py-8">
          <MaterialIcons name="photo-library" size={40} color="#CBD5E1" />
          <ThemedText className="mt-3 text-base font-medium text-slate-700">Chưa có ảnh nào</ThemedText>
          <ThemedText className="mt-1 text-sm text-slate-400">Ảnh bạn chia sẻ sẽ xuất hiện ở đây.</ThemedText>
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

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const postsSectionY = useRef<number>(0);
  const feedY = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [avatarPickerActive, setAvatarPickerActive] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);

  const isWide = width >= 1180;

  // Load user
  useEffect(() => {
    let isMounted = true;
    setIsLoadingUser(true);

    fetchCurrentUser()
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingUser(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowStatus(null);
      return;
    }

    let isMounted = true;
    fetchFollowStatus(user.id)
      .then((status) => {
        if (isMounted) {
          setFollowStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFollowStatus(null);
        }
      })
      .finally(() => {
        // Có thể thêm xử lý khi followStatus tải xong
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let isMounted = true;
      setLoadingPosts(true);

      fetchPosts(1, 10, user.id)
        .then((res) => {
          if (isMounted) setPosts(res.items);
        })
        .catch(() => { })
        .finally(() => {
          if (isMounted) setLoadingPosts(false);
        });

      return () => {
        isMounted = false;
      };
    }, [user])
  );

  const handleDeletePost = (postId: string) => {
    setPosts((current) => current.filter((p) => p.id !== postId));
  };

  const profile = useMemo(() => buildProfileViewModel(user), [user]);

  if (isLoadingUser) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#4A9FD8" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F1F5F9]" style={{ minHeight: height }}>
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-2 md:px-6">
            {/* Back header */}
            <View 
              className="flex-row items-center gap-3 bg-white px-5 py-4 border border-app-border mx-0 rounded-3xl shadow-sm"
              style={{ marginTop: Math.max(insets.top, 0) + 10 }}
            >
              <Pressable
                onPress={() => router.push('/')}
                className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9] active:opacity-80"
              >
                <ThemedText className="text-xl">←</ThemedText>
              </Pressable>
              <ThemedText className="text-[20px] font-bold text-slate-900">Hồ sơ</ThemedText>
            </View>

            {/* Profile card */}
            <ThemedView className="bg-white shadow-sm overflow-hidden md:rounded-[32px] md:border md:border-[#E4E8EE]">
              <View className="h-[180px] bg-[#D9ECF8]" />
              <View className="px-5 pb-5">
                <View className="-mt-12 flex-row items-end justify-between gap-4">
                  <View className="flex-row items-end gap-4">
                    {/* Avatar với picker state */}
                    <AvatarBlock
                      initials={profile.initials}
                      size="large"
                      avatarUrl={profile.avatarUrl}
                      onPress={() => setAvatarPickerActive((prev) => !prev)}
                      showPickerHint={avatarPickerActive}
                    />
                    <View className="pb-1">
                      <ThemedText className="text-[24px] font-bold text-slate-950">{profile.displayName}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Avatar picker action sheet */}
                {avatarPickerActive && (
                  <View className="mt-4 rounded-[18px] border border-[#E4E8EE] bg-[#F8FAFC] p-4">
                    <ThemedText className="mb-3 text-sm font-semibold text-slate-700">Thay đổi ảnh đại diện</ThemedText>
                    <View className="flex-row gap-3">
                      <Pressable
                        className="flex-1 items-center rounded-[14px] bg-[#4A9FD8] py-3 active:opacity-80"
                        onPress={() => {
                          setAvatarPickerActive(false);
                        }}
                      >
                        <ThemedText className="text-sm font-semibold text-white">Chọn ảnh</ThemedText>
                      </Pressable>
                      <Pressable
                        className="flex-1 items-center rounded-[14px] bg-[#F7F8FA] py-3 active:opacity-80"
                        onPress={() => setAvatarPickerActive(false)}
                      >
                        <ThemedText className="text-sm font-medium text-slate-700">Huỷ</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}

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
                            onPress={() => router.push({ pathname: '/profile/follows', params: { userId: user?.id, type: 'followers' } })}
                          >
                            <ThemedText className="text-[15px] font-bold text-slate-950">{followStatus.followers_count}</ThemedText>
                            <ThemedText className="text-[15px] text-slate-500">người theo dõi</ThemedText>
                          </Pressable>
                          <Pressable
                            className="flex-row items-center gap-1.5 active:opacity-70"
                            onPress={() => router.push({ pathname: '/profile/follows', params: { userId: user?.id, type: 'following' } })}
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
                        icon="edit"
                        label="Chỉnh sửa hồ sơ"
                        filled
                        onPress={() => router.push('/edit-profile')}
                      />
                    </View>
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
                      { icon: 'mail-outline' as const, value: profile.email, privacy: profile.emailPrivacy },
                      { icon: 'phone' as const, value: profile.phone, privacy: profile.contactPrivacy },
                      { icon: 'location-on' as const, value: profile.location, privacy: profile.locationPrivacy },
                    ]
                      .filter((item) => !!item.value)
                      .map((item) => {
                        let privacyIcon: keyof typeof MaterialIcons.glyphMap | null = null;
                        if (item.privacy === 'onlyme') privacyIcon = 'lock';
                        else if (item.privacy === 'followersonly') privacyIcon = 'group';

                        return (
                          <View key={item.icon} className="flex-row items-center gap-3">
                            <View className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                              <MaterialIcons name={item.icon} size={20} color="#64748B" />
                            </View>
                            <View className="flex-1 flex-row items-center gap-2">
                              <ThemedText className="text-base font-medium text-slate-800" numberOfLines={1}>
                                {item.value}
                              </ThemedText>
                              {privacyIcon && (
                                <MaterialIcons name={privacyIcon} size={14} color="#94A3B8" />
                              )}
                            </View>
                          </View>
                        );
                      })}
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
                      <ThemedView className={`${surfaceClass} items-center py-10`}>
                        <MaterialIcons name="article" size={40} color="#CBD5E1" />
                        <ThemedText className="mt-3 text-[20px] font-semibold text-slate-700">Chưa có bài viết</ThemedText>
                        <ThemedText className="mt-1 text-sm text-slate-400">Hãy tạo bài viết đầu tiên của bạn.</ThemedText>
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
