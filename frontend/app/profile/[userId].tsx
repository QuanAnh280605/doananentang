import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, fetchPosts } from '@/lib/api';
import { fetchFollowStatus, followUser, fetchUserProfile, type FollowStatus, unfollowUser, type AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

type ProfileTab = 'posts' | 'about' | 'media';

type MediaSpotlight = {
  id: string;
  title: string;
  subtitle: string;
  fillClassName: string;
};

const surfaceClass = 'rounded-surface border border-app-border bg-app-surface';
const mutedSurfaceClass = 'rounded-[24px] bg-[#F7F8FA]';

const tabs: { key: ProfileTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'posts', label: 'Posts', icon: 'grid-view' },
  { key: 'about', label: 'About', icon: 'person-outline' },
  { key: 'media', label: 'Media', icon: 'photo-library' },
];

const featuredMedia: MediaSpotlight[] = [
  {
    id: '1',
    title: 'Review systems playbook',
    subtitle: 'A tighter artifact for faster approvals and clearer motion notes.',
    fillClassName: 'bg-[#D9ECF8]',
  },
  {
    id: '2',
    title: 'Northfeed launch board',
    subtitle: 'Signals, rituals, and release checkpoints shaped for distributed teams.',
    fillClassName: 'bg-[#EEE8FF]',
  },
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
    initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  const intro = user.bio || '';
  const location = user.city || '';
  const email = user.email || '';
  const avatarUrl = user.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
    : null;
  return {
    displayName,
    initials: initials || 'N/A',
    intro,
    location,
    email,
    avatarUrl,
  };
}

function AvatarBlock({ initials, soft = false, size = 'large', avatarUrl }: { initials: string; soft?: boolean; size?: 'large' | 'small', avatarUrl?: string | null }) {
  const containerClassName =
    size === 'large'
      ? `h-[92px] w-[92px] rounded-[28px] overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`
      : `h-14 w-14 rounded-[22px] overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`;
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

function ActionButton({ icon, label, filled = false, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; filled?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4 active:opacity-90 ${filled ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}>
      <MaterialIcons color={filled ? '#FFFFFF' : '#0F172A'} name={icon} size={20} />
      <ThemedText className={`text-base font-medium ${filled ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
    </Pressable>
  );
}

function ProfileTabButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      className={`min-w-[112px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4 active:opacity-90 ${active ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}
      onPress={onPress}>
      <MaterialIcons color={active ? '#FFFFFF' : '#0F172A'} name={icon} size={18} />
      <ThemedText className={`text-base font-medium ${active ? 'text-white' : 'text-slate-900'}`}>{label}</ThemedText>
    </Pressable>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <ThemedText className="text-[24px] font-semibold text-slate-950">{title}</ThemedText>
        {subtitle ? <ThemedText className="mt-1 text-sm text-slate-500">{subtitle}</ThemedText> : null}
      </View>
      {action}
    </View>
  );
}

function SidebarCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title={title} action={action} />
      <View className="mt-5 gap-4">{children}</View>
    </ThemedView>
  );
}

function AboutPanel({ profile }: { profile: { displayName: string; initials: string; intro: string; location: string; email: string; avatarUrl: string | null } }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title="About" subtitle="Calm collaboration, sharper reviews, cleaner systems" />
      <View className="mt-5 gap-4">
        <View className={`${mutedSurfaceClass} px-4 py-4`}>
          <ThemedText className="text-base leading-7 text-slate-700">{profile.intro || 'Chưa có giới thiệu.'}</ThemedText>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {[profile.location].filter(Boolean).map((item) => (
            <View key={item} className="rounded-full bg-[#F7F8FA] px-4 py-3">
              <ThemedText className="text-sm font-medium text-slate-700">{item}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

function MediaPanel() {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title="Media" subtitle="Featured references and shareable artifacts" />
      <View className="mt-5 gap-4 lg:flex-row">
        {featuredMedia.map((item) => (
          <View key={item.id} className="flex-1 gap-3">
            <View className={`h-[220px] rounded-[28px] bg-[#F7F8FA] ${item.fillClassName}`} />
            <ThemedText className="text-lg font-semibold text-slate-950">{item.title}</ThemedText>
            <ThemedText className="text-sm leading-6 text-slate-600">{item.subtitle}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

export default function UserProfileScreen() {
  const { width, height } = useWindowDimensions();
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

  const [viewedUser, setViewedUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [followErrorMessage, setFollowErrorMessage] = useState<string | null>(null);
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
      .catch(() => {})
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

  const handleDeletePost = (postId: string) => {
    setPosts(current => current.filter(p => p.id !== postId));
  };

  const profile = useMemo(() => {
    return buildProfileViewModel(viewedUser, fallbackName, fallbackBio);
  }, [viewedUser, fallbackName, fallbackBio]);

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]" style={{ minHeight: height }}>
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            
            {/* Header / Back */}
            <View className="flex-row items-center gap-3 rounded-surface border border-app-border bg-app-surface px-5 py-4">
              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-80"
              >
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">{profile.displayName}</ThemedText>
              {isLoadingUser && <ActivityIndicator size="small" color="#4A9FD8" className="ml-2" />}
            </View>

            {/* Profile Card */}
            <ThemedView className={`${surfaceClass} overflow-hidden`}>
              <View className="h-[210px] bg-[#D9ECF8]" />
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

                    {followStatus ? (
                      <View className="mt-4 flex-row flex-wrap gap-5">
                        <View className="flex-row items-center gap-1.5">
                          <ThemedText className="text-[15px] font-bold text-slate-950">{followStatus.followers_count}</ThemedText>
                          <ThemedText className="text-[15px] text-slate-500">người theo dõi</ThemedText>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <ThemedText className="text-[15px] font-bold text-slate-950">{followStatus.following_count}</ThemedText>
                          <ThemedText className="text-[15px] text-slate-500">đang theo dõi</ThemedText>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  <View className={`${isWide ? 'w-[360px]' : ''} gap-3`}>
                    <View className="flex-row flex-wrap gap-3">
                      <Pressable
                        className="min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] px-4 py-4 active:opacity-90 bg-[#0A0A0A]"
                        disabled={numericUserId === null || isLoadingFollowStatus || isSubmittingFollow}
                        onPress={handleFollowToggle}
                      >
                        <ThemedText className="text-base font-medium text-white">
                          {isLoadingFollowStatus || isSubmittingFollow
                            ? 'Please wait...'
                            : followStatus?.is_following
                              ? 'Following'
                              : 'Follow'}
                        </ThemedText>
                      </Pressable>
                      <ActionButton icon="chat-bubble-outline" label="Message" />
                    </View>
                  </View>
                </View>
                {followErrorMessage ? <ThemedText className="mt-2 text-sm text-rose-600">{followErrorMessage}</ThemedText> : null}

                {/* Tabs selection */}
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

            {/* Content panels */}
            <View className={isWide ? 'flex-row items-start gap-4' : 'gap-4'}>
              <View className={isWide ? 'w-[320px] gap-4' : 'gap-4'}>
                
                {/* Intro Sidebar */}
                <SidebarCard title="Intro">
                  {profile.intro ? (
                    <ThemedText className="text-base leading-7 text-slate-700">
                      {profile.intro}
                    </ThemedText>
                  ) : (
                    <ThemedText className="text-base italic text-slate-400">
                      Chưa có giới thiệu.
                    </ThemedText>
                  )}

                  <View className="mt-4 gap-3">
                    {[
                      { icon: 'mail-outline', value: profile.email },
                      { icon: 'location-on', value: profile.location },
                    ]
                      .filter((item) => !!item.value)
                      .map((item) => (
                        <View key={item.icon} className="flex-row items-center gap-3">
                          <View className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
                            <MaterialIcons name={item.icon as any} size={20} color="#64748B" />
                          </View>
                          <ThemedText className="flex-1 text-base font-medium text-slate-800" numberOfLines={1}>
                            {item.value}
                          </ThemedText>
                        </View>
                      ))}
                  </View>
                </SidebarCard>

                {/* Featured media */}
                <SidebarCard title="Featured media">
                  {featuredMedia.map((item) => (
                    <View key={item.id} className="gap-3">
                      <View className={`h-[150px] rounded-[24px] bg-[#F7F8FA] ${item.fillClassName}`} />
                      <View>
                        <ThemedText className="text-lg font-semibold text-slate-950">{item.title}</ThemedText>
                        <ThemedText className="mt-1 text-sm leading-6 text-slate-600">{item.subtitle}</ThemedText>
                      </View>
                    </View>
                  ))}
                </SidebarCard>
              </View>

              {/* Central panels content */}
              <View className={isWide ? 'min-w-0 flex-1 gap-4' : 'gap-4'}>
                {activeTab === 'posts' ? (
                  <View className="gap-4">
                    <ThemedText className="px-1 text-[28px] font-semibold text-slate-950">Recent posts</ThemedText>
                    {loadingPosts ? (
                      <ThemedText className="text-slate-500 text-center py-4">Đang tải...</ThemedText>
                    ) : posts.length === 0 ? (
                      <ThemedText className="text-slate-500 text-center py-4">Chưa có bài viết nào.</ThemedText>
                    ) : (
                      posts.map((post) => (
                        <FeedPost key={post.id} item={post} onDelete={handleDeletePost} />
                      ))
                    )}
                  </View>
                ) : null}

                {activeTab === 'about' ? <AboutPanel profile={profile} /> : null}

                {activeTab === 'media' ? <MediaPanel /> : null}
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}
