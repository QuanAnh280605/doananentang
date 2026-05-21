import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMockUser, getMockPosts, updateMockUser } from '@/lib/mock-profile';
import type { AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

type ProfileTab = 'posts' | 'about' | 'media';

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
  email: string;
  avatarUrl: string | null;
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
  const avatarUrl = user?.avatar_url ?? null;
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
      ? `h-[92px] w-[92px] rounded-[28px] overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`
      : `h-14 w-14 rounded-[22px] overflow-hidden ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`;
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
          <View className="absolute inset-0 items-center justify-center rounded-[28px] bg-black/40">
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
      className={`min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-[18px] px-4 py-[14px] active:opacity-90 ${filled ? 'bg-[#4A9FD8]' : 'bg-[#F7F8FA]'}`}
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
      className={`min-w-[112px] flex-1 flex-row items-center justify-center gap-2 rounded-[18px] px-4 py-[14px] active:opacity-90 ${active ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}
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
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title={title} action={action} />
      <View className="mt-5 gap-4">{children}</View>
    </ThemedView>
  );
}

// Banner thông báo thành công sau khi lưu inline intro
function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-[14px] bg-[#DCFCE7] px-4 py-3">
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

function AboutPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title="About" subtitle="Thông tin cơ bản" />
      <View className="mt-5 gap-4">
        {profile.intro ? (
          <View className={`${mutedSurfaceClass} px-4 py-4`}>
            <ThemedText className="text-base leading-7 text-slate-700">{profile.intro}</ThemedText>
          </View>
        ) : (
          <ThemedText className="text-base italic text-slate-400">Chưa có giới thiệu.</ThemedText>
        )}
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
      <SectionTitle title="Media" subtitle="Ảnh và tài liệu đã chia sẻ" />
      <View className="mt-5 gap-4 lg:flex-row">
        {featuredMedia.map((item) => (
          <View key={item.id} className="flex-1 gap-3">
            <View className={`h-[220px] rounded-[24px] bg-[#F7F8FA] ${item.fillClassName}`} />
            <ThemedText className="text-lg font-semibold text-slate-950">{item.title}</ThemedText>
            <ThemedText className="text-sm leading-6 text-slate-600">{item.subtitle}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Avatar picker state
  const [avatarPickerActive, setAvatarPickerActive] = useState(false);

  // Inline intro editing state
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [tempIntro, setTempIntro] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [isSavingIntro, setIsSavingIntro] = useState(false);
  const [introSaved, setIntroSaved] = useState(false);

  const isWide = width >= 1180;

  // Load mock user
  useEffect(() => {
    let isMounted = true;
    setIsLoadingUser(true);

    getMockUser()
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
          setTempIntro(nextUser.bio || '');
          setTempCity(nextUser.city || '');
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

  // Load mock posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingPosts(true);

    getMockPosts()
      .then((res) => {
        if (isMounted) setPosts(res.items);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeletePost = (postId: string) => {
    setPosts((current) => current.filter((p) => p.id !== postId));
  };

  const handleSaveIntro = async () => {
    setIsSavingIntro(true);
    try {
      const updatedUser = await updateMockUser({
        bio: tempIntro.trim() || null,
        city: tempCity.trim() || null,
      });
      setUser(updatedUser);
      setIsEditingIntro(false);
      setIntroSaved(true);
      setTimeout(() => setIntroSaved(false), 3000);
    } catch {
      // lỗi mock không xảy ra, nhưng giữ catch an toàn
    } finally {
      setIsSavingIntro(false);
    }
  };

  const handleCancelIntro = () => {
    setTempIntro(user?.bio || '');
    setTempCity(user?.city || '');
    setIsEditingIntro(false);
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
      <ThemedView className="flex-1 bg-[#F8FAFC]" style={{ minHeight: height }}>
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            {/* Back header */}
            <View className="flex-row items-center gap-3 rounded-surface border border-app-border bg-app-surface px-5 py-4">
              <Pressable
                onPress={() => router.push('/')}
                className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-80"
              >
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">Hồ sơ</ThemedText>
              {/* Mock indicator badge */}
              <View className="ml-auto rounded-full bg-[#FEF9C3] px-3 py-1">
                <ThemedText className="text-xs font-semibold text-[#854D0E]">MOCK DATA</ThemedText>
              </View>
            </View>

            {/* Profile card */}
            <ThemedView className={`${surfaceClass} overflow-hidden`}>
              <View className="h-[210px] bg-[#D9ECF8]" />
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

                {/* Avatar picker action sheet (mock) */}
                {avatarPickerActive && (
                  <View className="mt-4 rounded-[18px] border border-[#E4E8EE] bg-[#F8FAFC] p-4">
                    <ThemedText className="mb-3 text-sm font-semibold text-slate-700">Thay đổi ảnh đại diện</ThemedText>
                    <View className="flex-row gap-3">
                      <Pressable
                        className="flex-1 items-center rounded-[14px] bg-[#4A9FD8] py-3 active:opacity-80"
                        onPress={() => {
                          // Trong mock: chỉ toggle state, không mở picker thật
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
                  <View className={isWide ? 'max-w-[760px] flex-1' : ''} />
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
            <View className={isWide ? 'flex-row items-start gap-4' : 'gap-4'}>
              {/* Sidebar */}
              <View className={isWide ? 'w-[320px] gap-4' : 'gap-4'}>
                {/* Success banner sau khi lưu intro */}
                {introSaved && (
                  <SuccessBanner
                    message="Đã lưu thông tin giới thiệu"
                    onDismiss={() => setIntroSaved(false)}
                  />
                )}

                <SidebarCard
                  title="Giới thiệu"
                  action={
                    !isEditingIntro ? (
                      <Pressable
                        onPress={() => setIsEditingIntro(true)}
                        className="h-9 w-9 items-center justify-center active:opacity-60"
                        accessibilityLabel="Chỉnh sửa giới thiệu"
                      >
                        <MaterialIcons name="edit" size={20} color="#64748B" />
                      </Pressable>
                    ) : null
                  }
                >
                  {isEditingIntro ? (
                    <View className="gap-4">
                      <View>
                        <ThemedText className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-slate-500">
                          Thành phố
                        </ThemedText>
                        <TextInput
                          className="rounded-[18px] border border-slate-200 bg-[#F7F8FA] px-4 py-3 text-base text-slate-900"
                          value={tempCity}
                          onChangeText={setTempCity}
                          placeholder="VD: Hà Nội, VN"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View>
                        <ThemedText className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-slate-500">
                          Bio / Giới thiệu
                        </ThemedText>
                        <TextInput
                          className="rounded-[18px] border border-slate-200 bg-[#F7F8FA] px-4 py-3 text-base text-slate-900"
                          multiline
                          numberOfLines={4}
                          value={tempIntro}
                          onChangeText={setTempIntro}
                          placeholder="Giới thiệu về bạn..."
                          placeholderTextColor="#94A3B8"
                          textAlignVertical="top"
                        />
                      </View>

                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={handleSaveIntro}
                          disabled={isSavingIntro}
                          className="flex-1 items-center rounded-[18px] bg-[#4A9FD8] py-3 active:opacity-80 disabled:opacity-50"
                        >
                          {isSavingIntro ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <ThemedText className="text-sm font-semibold text-white">Lưu</ThemedText>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={handleCancelIntro}
                          className="flex-1 items-center rounded-[18px] bg-[#F7F8FA] py-3 active:opacity-80"
                        >
                          <ThemedText className="text-sm font-semibold text-slate-700">Huỷ</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      {profile.intro ? (
                        <ThemedText className="text-base leading-7 text-slate-700">{profile.intro}</ThemedText>
                      ) : (
                        <ThemedText className="text-base italic text-slate-400">Chưa có giới thiệu.</ThemedText>
                      )}

                      <View className="mt-4 gap-3">
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
                              <ThemedText className="flex-1 text-base font-medium text-slate-800" numberOfLines={1}>
                                {item.value}
                              </ThemedText>
                            </View>
                          ))}
                      </View>
                    </>
                  )}
                </SidebarCard>

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

              {/* Main content area */}
              <View className={isWide ? 'min-w-0 flex-1 gap-4' : 'gap-4'}>
                {activeTab === 'posts' ? (
                  <View className="gap-4">
                    <ThemedText className="px-1 text-[26px] font-semibold text-slate-950">Bài viết gần đây</ThemedText>
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
