import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FeedPost } from '@/components/post/FeedPost';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL, fetchPosts } from '@/lib/api';
import { fetchCurrentUser, updateUserProfile, type AuthUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

type ProfileTab = 'posts' | 'about' | 'media';

type MediaSpotlight = {
  id: string;
  title: string;
  subtitle: string;
  fillClassName: string;
};

type RecentPost = {
  id: string;
  time: string;
  body: string;
  accentClassName: string;
};

type ProfileViewModel = {
  displayName: string;
  initials: string;
  intro: string;
  location: string;
  email: string;
  avatarUrl: string | null;
};

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';
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

const recentPosts: RecentPost[] = [
  {
    id: '1',
    time: 'Updated 12 min ago',
    body:
      'Thanh Trì quê ta ơi',
    accentClassName: 'bg-[#D9ECF8]',
  },
  {
    id: '2',
    time: 'Yesterday',
    body:
      'Pinned three references that keep social products feeling light: fewer panels, stronger hierarchy, and interaction states that resolve without noise.',
    accentClassName: 'bg-[#FCE7F3]',
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

  const emailHandle = user?.email ? user.email.replace(/^mailto:/, '') : '';
  const intro = user?.bio || '';
  const location = user?.city || '';
  const email = user?.email || '';
  const avatarUrl = user?.avatar_url ? `${API_URL}${user.avatar_url}` : null;
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

function PostCard({ initials, post }: { initials: string; post: RecentPost }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-row items-center gap-4">
          <AvatarBlock initials={initials} soft size="small" />
          <View>
            <ThemedText className="text-[20px] font-semibold text-slate-950">Lena Evere</ThemedText>
            <ThemedText className="text-sm text-slate-500">{post.time}</ThemedText>
          </View>
        </View>
        <Pressable className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-90">
          <MaterialIcons color="#666666" name="more-horiz" size={20} />
        </Pressable>
      </View>

      <ThemedText className="mt-5 text-[16px] leading-7 text-slate-700">{post.body}</ThemedText>

      <View className={`mt-5 h-[220px] overflow-hidden rounded-[28px] ${post.accentClassName}`}>
        <View className="h-full w-full bg-black/5" />
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <ThemedText className="text-sm text-slate-500">384 reactions</ThemedText>
        <ThemedText className="text-sm text-slate-500">28 comments 6 shares</ThemedText>
      </View>
    </ThemedView>
  );
}

function AboutPanel({ profile }: { profile: ProfileViewModel }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <SectionTitle title="About" subtitle="Calm collaboration, sharper reviews, cleaner systems" />
      <View className="mt-5 gap-4">
        <View className={`${mutedSurfaceClass} px-4 py-4`}>
          <ThemedText className="text-base leading-7 text-slate-700">{profile.intro}</ThemedText>
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

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [tempIntro, setTempIntro] = useState('');
  const [tempCity, setTempCity] = useState('');
  const [isSavingIntro, setIsSavingIntro] = useState(false);
  const isWide = width >= 1180;
  const viewedProfileUserId = user?.id ?? null;
  const currentUserId = user?.id ?? null;
  const isOwnProfile = viewedProfileUserId === null || currentUserId === null || viewedProfileUserId === currentUserId;

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const nextUser = await fetchCurrentUser();

        if (isMounted) {
          setUser(nextUser);
          if (nextUser) {
            setTempIntro(nextUser.bio || '');
            setTempCity(nextUser.city || '');
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoadingPosts(true);

    fetchPosts(1, 20, user.id)
      .then((res) => {
        if (isMounted) {
          setPosts(res.items);
        }
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
    setPosts(current => current.filter(p => p.id !== postId));
  };

  const handleSaveIntro = async () => {
    setIsSavingIntro(true);
    try {
      await updateUserProfile({
        bio: tempIntro.trim() || null,
        city: tempCity.trim() || null,
      });
      const updatedUser = await fetchCurrentUser();
      setUser(updatedUser);
      setIsEditingIntro(false);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin.');
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

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]" style={{ minHeight: height }}>
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            {/* Back header */}
            <View className="flex-row items-center gap-3 rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
              <Pressable
                onPress={() => router.push('/')}
                className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-80"
              >
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">Profile</ThemedText>
            </View>

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
                  </View>

                  <View className={`${isWide ? 'w-[360px]' : ''} gap-3`}>
                    {isOwnProfile ? (
                      <View className="flex-row flex-wrap gap-3">
                        <ActionButton icon="edit" label="Edit profile" filled onPress={() => router.push('/edit-profile')} />
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-3">
                        <ActionButton icon="person-add-alt-1" label="Follow" filled />
                        <ActionButton icon="chat-bubble-outline" label="Message" />
                      </View>
                    )}
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

            <View className={isWide ? 'flex-row items-start gap-4' : 'gap-4'}>
              <View className={isWide ? 'w-[320px] gap-4' : 'gap-4'}>
                <SidebarCard 
                  title="Intro"
                  action={isOwnProfile && !isEditingIntro ? (
                    <Pressable onPress={() => setIsEditingIntro(true)} className="active:opacity-60">
                      <MaterialIcons name="edit" size={20} color="#64748B" />
                    </Pressable>
                  ) : null}
                >
                  {isEditingIntro ? (
                    <View className="gap-4">
                      <View>
                        <ThemedText className="mb-1 text-xs font-semibold text-slate-500">LOCATION</ThemedText>
                        <TextInput
                          className="rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 py-2.5 text-base text-slate-900"
                          value={tempCity}
                          onChangeText={setTempCity}
                          placeholder="VD: Hà Nội, VN"
                        />
                      </View>

                      <View>
                        <ThemedText className="mb-1 text-xs font-semibold text-slate-500">BIO / INTRO</ThemedText>
                        <TextInput
                          className="rounded-xl border border-slate-200 bg-[#F7F8FA] px-4 py-3 text-base text-slate-900"
                          multiline
                          numberOfLines={4}
                          value={tempIntro}
                          onChangeText={setTempIntro}
                          placeholder="Giới thiệu về bạn..."
                          textAlignVertical="top"
                        />
                      </View>

                      <View className="mt-2 flex-row gap-2">
                        <Pressable 
                          onPress={handleSaveIntro}
                          disabled={isSavingIntro}
                          className="flex-1 items-center rounded-full bg-slate-900 py-3 active:opacity-80 disabled:opacity-50"
                        >
                          {isSavingIntro ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <ThemedText className="text-sm font-semibold text-white">Save All</ThemedText>
                          )}
                        </Pressable>
                        <Pressable 
                          onPress={handleCancelIntro}
                          className="flex-1 items-center rounded-full bg-[#F7F8FA] py-3 active:opacity-80"
                        >
                          <ThemedText className="text-sm font-semibold text-slate-700">Cancel</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
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
