import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ShortcutItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone: string;
};

type StoryItem = {
  id: string;
  name: string;
  accent: string;
  image: string;
};

type PostItem = {
  id: string;
  author: string;
  group: string;
  time: string;
  caption: string;
  image: string;
  stats: string;
};

const shortcuts: ShortcutItem[] = [
  { icon: 'smart-toy', label: 'Meta AI', tone: 'bg-violet-500' },
  { icon: 'groups', label: 'Ban be', tone: 'bg-sky-500' },
  { icon: 'space-dashboard', label: 'Bang dieu khien', tone: 'bg-indigo-500' },
  { icon: 'history', label: 'Ky niem', tone: 'bg-cyan-500' },
  { icon: 'bookmark', label: 'Da luu', tone: 'bg-pink-500' },
  { icon: 'group-work', label: 'Nhom', tone: 'bg-blue-500' },
  { icon: 'smart-display', label: 'Video', tone: 'bg-teal-500' },
];

const stories: StoryItem[] = [
  { id: 'create', name: 'Tao tin', accent: 'bg-slate-200', image: 'bg-gradient-to-b from-slate-200 to-slate-400' },
  { id: '1', name: 'Truong Tuan Tu', accent: 'bg-cyan-500', image: 'bg-gradient-to-b from-sky-100 to-sky-300' },
  { id: '2', name: 'Day Gieng', accent: 'bg-sky-500', image: 'bg-gradient-to-b from-emerald-100 to-emerald-300' },
  { id: '3', name: 'Tuan Anh', accent: 'bg-blue-500', image: 'bg-gradient-to-b from-amber-100 to-orange-300' },
  { id: '4', name: 'Khanh Vy', accent: 'bg-fuchsia-500', image: 'bg-gradient-to-b from-fuchsia-100 to-violet-300' },
  { id: '5', name: 'Nguyen Huu Tri', accent: 'bg-rose-500', image: 'bg-gradient-to-b from-rose-100 to-slate-300' },
];

const posts: PostItem[] = [
  {
    id: 'post-1',
    author: 'J2TEAM Community',
    group: 'Bao Nguyen',
    time: '1 gio',
    caption:
      'Sau 4 nam ke tu nguoi choi Tran Dang Dang Khoa la nguoi thu 2 vuot qua cau 14, hom nay Nguyen Truong Giang tro thanh nguoi thu 3 lam duoc dieu do. Ban co theo doi gameshow toi qua khong?',
    image: 'bg-gradient-to-br from-[#DDEAFF] via-[#BFD8FF] to-[#95BCFF]',
    stats: '15K luot thich · 1.8K binh luan · 427 luot chia se',
  },
  {
    id: 'post-2',
    author: 'AI Engineering Community',
    group: 'Quan tri vien',
    time: '3 gio',
    caption:
      'Demo feed moi cho app mobile: top nav day du, story ngang va post card dang toi uu cho ca dien thoai lan tablet. Ban co muon bo sung khu vuc message nhanh o goc phai khong?',
    image: 'bg-gradient-to-br from-[#E6F3FF] via-[#CBE3FF] to-[#B6F0D6]',
    stats: '3.1K luot thich · 212 binh luan · 58 luot chia se',
  },
];

function NavIcon({ name, active = false }: { name: keyof typeof MaterialIcons.glyphMap; active?: boolean }) {
  return (
    <View
      className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-[#E9F2FF]' : 'bg-[#EEF3FB]'}`}>
      <MaterialIcons color={active ? '#1877F2' : '#475569'} name={name} size={22} />
    </View>
  );
}

function ShortcutRow({ item }: { item: ShortcutItem }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-2 py-2">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${item.tone}`}>
        <MaterialIcons color="#FFFFFF" name={item.icon} size={21} />
      </View>
      <ThemedText className="text-[15px] font-semibold text-slate-800">{item.label}</ThemedText>
    </View>
  );
}

function StoryCard({ story, first }: { story: StoryItem; first?: boolean }) {
  return (
    <View
      className={`h-48 overflow-hidden rounded-[18px] border border-[#D9E6FA] ${first ? 'w-28' : 'w-24'} ${story.image}`}>
      <View className="flex-1 justify-between p-3">
        <View className={`h-10 w-10 items-center justify-center rounded-full border-4 border-[#1877F2] ${story.accent}`}>
          <MaterialIcons color="#FFFFFF" name={first ? 'add' : 'person'} size={first ? 22 : 18} />
        </View>
        <ThemedText className="text-sm font-semibold leading-5 text-slate-900">{story.name}</ThemedText>
      </View>
    </View>
  );
}

function Composer() {
  return (
    <ThemedView className="rounded-[20px] border border-[#D9E6FA] bg-white p-4 shadow-sm shadow-slate-200">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-400">
          <MaterialIcons color="#FFFFFF" name="person" size={24} />
        </View>
        <View className="flex-1 rounded-full bg-[#F1F5F9] px-4 py-3">
          <ThemedText className="text-[15px] text-slate-500">Quan oi, ban dang nghi gi the?</ThemedText>
        </View>
        <View className="rounded-full bg-[#1877F2] px-5 py-3">
          <ThemedText className="text-sm font-bold text-white">Lam moi</ThemedText>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-end gap-4 border-t border-[#E2E8F0] pt-3">
        <MaterialIcons color="#F43F5E" name="videocam" size={22} />
        <MaterialIcons color="#22C55E" name="collections" size={22} />
        <MaterialIcons color="#FB7185" name="movie" size={22} />
      </View>
    </ThemedView>
  );
}

function PostCard({ post }: { post: PostItem }) {
  return (
    <ThemedView className="overflow-hidden rounded-[20px] border border-[#D9E6FA] bg-white shadow-sm shadow-slate-200">
      <View className="flex-row items-start justify-between gap-3 px-4 pb-3 pt-4">
        <View className="flex-row gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-500">
            <MaterialIcons color="#FFFFFF" name="person" size={24} />
          </View>
          <View className="max-w-[78%]">
            <ThemedText className="text-[17px] font-bold text-slate-900">{post.author}</ThemedText>
            <ThemedText className="mt-1 text-sm text-slate-500">
              {post.group} · {post.time}
            </ThemedText>
          </View>
        </View>

        <View className="flex-row gap-2">
          <MaterialIcons color="#64748B" name="more-horiz" size={22} />
          <MaterialIcons color="#64748B" name="close" size={22} />
        </View>
      </View>

      <ThemedText className="px-4 pb-4 text-[15px] leading-6 text-slate-700">{post.caption}</ThemedText>

      <View className={`h-72 items-center justify-center ${post.image}`}>
        <View className="rounded-full bg-white/70 px-6 py-3">
          <ThemedText className="text-lg font-bold text-slate-800">Facebook-style mock post</ThemedText>
        </View>
      </View>

      <View className="px-4 pb-3 pt-3">
        <ThemedText className="text-sm text-slate-500">{post.stats}</ThemedText>
      </View>

      <View className="flex-row border-t border-[#E2E8F0]">
        {[
          ['thumb-up-off-alt', 'Thich'],
          ['chat-bubble-outline', 'Binh luan'],
          ['reply', 'Chia se'],
        ].map(([icon, label]) => (
          <View key={label} className="flex-1 flex-row items-center justify-center gap-2 px-2 py-3">
            <MaterialIcons color="#64748B" name={icon as keyof typeof MaterialIcons.glyphMap} size={20} />
            <ThemedText className="text-sm font-semibold text-slate-600">{label}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView className="rounded-[20px] border border-[#D9E6FA] bg-white p-4 shadow-sm shadow-slate-200">
      <ThemedText className="text-lg font-bold text-slate-900">{title}</ThemedText>
      <View className="mt-4 gap-3">{children}</View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;
  const isTablet = width >= 860;

  return (
    <ThemedView className="flex-1 bg-[#F4F8FF]">
      <StatusBar style="dark" />

      <View className="border-b border-[#D9E6FA] bg-white px-3 pb-3 pt-3 shadow-sm shadow-slate-200">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1877F2]">
              <ThemedText className="text-[30px] font-bold lowercase text-white">f</ThemedText>
            </View>

            <View className={`rounded-full bg-[#EEF3FB] px-4 py-3 ${isTablet ? 'max-w-[280px] flex-1' : 'flex-1'}`}>
              <View className="flex-row items-center gap-2">
                <MaterialIcons color="#9CA3AF" name="search" size={20} />
                <ThemedText className="text-[15px] text-slate-500">Tim kiem tren Facebook</ThemedText>
              </View>
            </View>
          </View>

          {isTablet ? (
            <View className="mx-4 flex-row items-center gap-4">
              <NavIcon name="home-filled" active />
              <NavIcon name="groups" />
              <NavIcon name="smart-display" />
              <NavIcon name="storefront" />
              <NavIcon name="account-circle" />
            </View>
          ) : null}

          <View className="flex-row items-center gap-2">
            <NavIcon name="apps" />
            <NavIcon name="chat" />
            <NavIcon name="notifications" />
            <NavIcon name="person" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-[1580px] px-3 py-4" showsVerticalScrollIndicator={false}>
        <View className={`gap-4 ${isDesktop ? 'flex-row items-start' : ''}`}>
          {isDesktop ? (
            <View className="w-[300px] gap-4">
              <SidebarCard title="Nguyen Anh Quan">
                {shortcuts.map((item) => (
                  <ShortcutRow key={item.label} item={item} />
                ))}
              </SidebarCard>
            </View>
          ) : null}

          <View className={`${isDesktop ? 'flex-1 max-w-[680px]' : 'w-full'} gap-4 self-stretch`}>
            <Composer />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {stories.map((story, index) => (
                <StoryCard key={story.id} story={story} first={index === 0} />
              ))}
            </ScrollView>

            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>

          {isDesktop ? (
            <View className="w-[320px] gap-4">
              <SidebarCard title="Duoc tai tro">
                <View className="rounded-[18px] bg-[#F8FBFF] p-4">
                  <ThemedText className="text-xl font-bold text-slate-900">Coding Plan</ThemedText>
                  <ThemedText className="mt-2 text-sm leading-6 text-slate-700">
                    Cost-effective R&D power for sustainable growth.
                  </ThemedText>
                </View>
                <View className="rounded-[18px] bg-[#E9F2FF] p-4">
                  <ThemedText className="text-base font-semibold text-slate-800">Big 2026 Plans, Small Creative Team?</ThemedText>
                </View>
              </SidebarCard>

              <SidebarCard title="Nguoi lien he">
                {['Bao Nguyen', 'Khanh Vy', 'Truong Tuan', 'Tuan Anh'].map((name) => (
                  <View key={name} className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-500">
                      <MaterialIcons color="#FFFFFF" name="person" size={22} />
                    </View>
                    <ThemedText className="text-[15px] font-medium text-slate-700">{name}</ThemedText>
                  </View>
                ))}
              </SidebarCard>
            </View>
          ) : null}
        </View>

        {!isDesktop ? (
          <View className="mt-4 gap-4">
            <SidebarCard title="Loi tat cua ban">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
                {shortcuts.map((item) => (
                  <View key={item.label} className="min-w-[150px] rounded-[18px] border border-[#D9E6FA] bg-white p-3">
                    <ShortcutRow item={item} />
                  </View>
                ))}
              </ScrollView>
            </SidebarCard>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}
