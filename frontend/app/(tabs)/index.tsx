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
import { fetchPosts } from '@/lib/api';
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
  id: string;
  name: string;
  status: string;
  initials: string;
  bio: string;
};

type InboxItem = {
  id: string;
  name: string;
  message: string;
  initials: string;
  bio: string;
  unread?: boolean;
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



const contacts: Contact[] = [
  { id: 'am', name: 'Ari Mendoza', status: 'Editing new campaign', initials: 'AM', bio: 'Builds campaign systems and keeps launch assets moving.' },
  { id: 'ne', name: 'Nadia Elsner', status: 'Reviewing typography', initials: 'NE', bio: 'Writes crisp product copy and organizes review-ready profile content.' },
  { id: 'jt', name: 'Jules Tate', status: 'In Riverside Studio', initials: 'JT', bio: 'Supports studio sessions and visual coordination across teams.' },
  { id: 'oy', name: 'Owen Ybarra', status: 'Exporting review clips', initials: 'OY', bio: 'Handles review exports, clips, and last-mile production polish.' },
];

const inboxItems: InboxItem[] = [
  { id: 'rm', name: 'Rafi Mercer', message: 'Can you review the revised launch pacing?', initials: 'RM', bio: 'Focuses on motion pacing, interaction polish, and handoff clarity.', unread: true },
  { id: 'at', name: 'Aya Tran', message: 'Dropping sprint references in five minutes.', initials: 'AT', bio: 'Shapes visual systems and tightens typography for product launches.' },
  { id: 'ne', name: 'Nadia Elsner', message: 'Shared fresh type comps for the thread.', initials: 'NE', bio: 'Writes crisp product copy and organizes review-ready profile content.' },
];


function ActionBubble({ icon, filled = false }: { icon: keyof typeof MaterialIcons.glyphMap; filled?: boolean }) {
  return (
    <View className={`h-12 w-12 items-center justify-center rounded-[18px] ${filled ? 'bg-[#0A0A0A]' : 'bg-[#F7F8FA]'}`}>
      <MaterialIcons color={filled ? '#FFFFFF' : '#666666'} name={icon} size={21} />
    </View>
  );
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
        <Avatar initials={item.initials} soft />
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
          userId: item.id,
          name: item.name,
          initials: item.initials,
          preview: item.message,
          bio: item.bio,
        },
      }}>
      <Pressable className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4 active:opacity-90">
        <Avatar initials={item.initials} soft />
        <View className="flex-1 gap-1">
          <ThemedText className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
          <ThemedText className="text-sm text-slate-500">{item.message}</ThemedText>
        </View>
        {item.unread ? <View className="h-3 w-3 rounded-full bg-[#4A9FD8]" /> : null}
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

function RightRail() {
  return (
    <View className="gap-4">
      <SectionCard title="Contacts" rightLabel="12 online">
        {contacts.map((item) => (
          <ContactRow key={item.name} item={item} />
        ))}
      </SectionCard>

      <ThemedView className={`${surfaceClass} p-5`}>
        <View className="flex-row items-center gap-3">
          <View className="rounded-full bg-[#D9ECF8] px-3 py-2">
            <ThemedText className="text-sm font-semibold text-slate-900">Tonight</ThemedText>
          </View>
        </View>
        <ThemedText className="mt-4 text-[24px] font-semibold leading-8 text-slate-950">
          Prototype review with motion notes
        </ThemedText>
        <ThemedText className="mt-3 text-base text-slate-500">18:30 - 19:15 | Riverside Studio 4</ThemedText>
        <View className="mt-5 self-start rounded-[20px] bg-[#0A0A0A] px-5 py-4">
          <ThemedText className="text-base font-medium text-white">View brief</ThemedText>
        </View>
      </ThemedView>

      <SectionCard title="Messenger" rightLabel="3 unread">
        {inboxItems.map((item) => (
          <MessengerRow key={item.name} item={item} />
        ))}

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
          <AppTopNav isTablet={isTablet} searchPlaceholder="Search users" avatarUrl={currentUser?.avatar_url}
            avatarInitials={currentUser ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() : 'LE'}
          />

          <View className={`mt-4 gap-4 ${isDesktop ? 'flex-row items-start' : ''}`}>
            <View className={isDesktop ? 'w-[350px]' : 'w-full'}>
              <ProfileRail currentUser={currentUser} />
            </View>

            <View className={`${isDesktop ? 'flex-1' : 'w-full'} gap-4`}>
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

            <View className={isDesktop ? 'w-[360px]' : 'w-full'}>
              <RightRail />
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
