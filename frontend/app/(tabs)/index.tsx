import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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

type Post = {
  id: string;
  author: string;
  time: string;
  caption: string;
  reactions: string;
  meta: string;
};

type Contact = {
  name: string;
  status: string;
  initials: string;
};

type InboxItem = {
  name: string;
  message: string;
  initials: string;
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

const posts: Post[] = [
  {
    id: '1',
    author: 'Lina Corbe',
    time: '32 min ago',
    caption:
      'Wrapped an early prototype for the studio dashboard. The quieter version tested better than the busy one, so I pulled the motion back and kept the signal stronger.',
    reactions: '384 reactions',
    meta: '28 comments 6 shares',
  },
  {
    id: '2',
    author: 'Rafi Mercer',
    time: '1 hr ago',
    caption:
      'We cut the launch page into a lighter sequence and the handoff got noticeably faster. Posting the revised frame set for comments before lunch.',
    reactions: '142 reactions',
    meta: '17 comments 3 shares',
  },
  {
    id: '3',
    author: 'Aya Tran',
    time: '3 hr ago',
    caption:
      'Collecting references for the May sprint. Drop one detail you think social products still get wrong: too much chrome, weak context, or noisy motion?',
    reactions: '96 reactions',
    meta: '54 comments 2 reposts',
  },
];

const contacts: Contact[] = [
  { name: 'Ari Mendoza', status: 'Editing new campaign', initials: 'AM' },
  { name: 'Nadia Elsner', status: 'Reviewing typography', initials: 'NE' },
  { name: 'Jules Tate', status: 'In Riverside Studio', initials: 'JT' },
  { name: 'Owen Ybarra', status: 'Exporting review clips', initials: 'OY' },
];

const inboxItems: InboxItem[] = [
  { name: 'Rafi Mercer', message: 'Can you review the revised launch pacing?', initials: 'RM', unread: true },
  { name: 'Aya Tran', message: 'Dropping sprint references in five minutes.', initials: 'AT' },
  { name: 'Nadia Elsner', message: 'Shared fresh type comps for the thread.', initials: 'NE' },
];

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

function Avatar({ initials, soft = false }: { initials: string; soft?: boolean }) {
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-[22px] ${soft ? 'bg-[#D9ECF8]' : 'bg-[#EAF4FB]'}`}>
      <ThemedText className="text-base font-semibold tracking-[0.5px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

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

function ComposerCard() {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <View className="flex-row items-center gap-4">
        <Avatar initials="LC" soft />
        <View className="flex-1 rounded-[24px] bg-[#F7F8FA] px-5 py-4">
          <ThemedText className="text-base text-slate-500">Share a project update, a photo, or a thought</ThemedText>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-3 border-t border-[#E4E8EE] pt-4">
        {[
          ['videocam', 'Live', '#D05B5B'],
          ['image', 'Photo', '#41A36D'],
          ['edit-note', 'Write note', '#4A9FD8'],
        ].map(([icon, label, color]) => (
          <View key={label} className="min-w-[150px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4">
            <MaterialIcons color={color} name={icon as keyof typeof MaterialIcons.glyphMap} size={20} />
            <ThemedText className="text-base font-medium text-slate-900">{label}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

function FeedPost({ item }: { item: Post }) {
  return (
    <ThemedView className={`${surfaceClass} p-5`}>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-row items-center gap-4">
          <Avatar initials={item.author.slice(0, 2).toUpperCase()} soft />
          <View>
            <ThemedText className="text-[21px] font-semibold text-slate-950">{item.author}</ThemedText>
            <ThemedText className="text-sm text-slate-500">{item.time}</ThemedText>
          </View>
        </View>

        <ActionBubble icon="more-horiz" />
      </View>

      <ThemedText className="mt-6 text-[16px] leading-7 text-slate-700">{item.caption}</ThemedText>

      <View className="mt-5 h-[220px] rounded-[28px] bg-[#F7F8FA]" />

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <ThemedText className="text-sm text-slate-500">{item.reactions}</ThemedText>
        <ThemedText className="text-sm text-slate-500">{item.meta}</ThemedText>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-3 border-t border-[#E4E8EE] pt-4">
        {[
          ['thumb-up-off-alt', 'Like'],
          ['chat-bubble-outline', 'Comment'],
          ['reply', 'Share'],
        ].map(([icon, label]) => (
          <View key={label} className="min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4">
            <MaterialIcons color="#666666" name={icon as keyof typeof MaterialIcons.glyphMap} size={20} />
            <ThemedText className="text-base font-medium text-slate-900">{label}</ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

function ContactRow({ item }: { item: Contact }) {
  return (
    <View className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
      <Avatar initials={item.initials} soft />
      <View className="flex-1">
        <ThemedText className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
        <ThemedText className="text-sm text-slate-500">{item.status}</ThemedText>
      </View>
      <View className="h-3 w-3 rounded-full bg-[#6FC18A]" />
    </View>
  );
}

function MessengerRow({ item }: { item: InboxItem }) {
  return (
    <View className="flex-row items-center gap-4 rounded-[22px] bg-[#F7F8FA] px-4 py-4">
      <Avatar initials={item.initials} soft />
      <View className="flex-1 gap-1">
        <ThemedText className="text-lg font-medium text-slate-900">{item.name}</ThemedText>
        <ThemedText className="text-sm text-slate-500">{item.message}</ThemedText>
      </View>
      {item.unread ? <View className="h-3 w-3 rounded-full bg-[#4A9FD8]" /> : null}
    </View>
  );
}

function ProfileRail() {
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
            <Avatar initials="LE" />
          </View>

          <ThemedText className="mt-4 text-[28px] font-semibold text-slate-950">Lena Evere</ThemedText>
          <ThemedText className="mt-2 text-base leading-7 text-slate-600">
            Leading product design at Northfeed, shaping calmer social tools for creative teams.
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

  return (
    <ThemedView className="flex-1 bg-[#EDF1F5]">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav isTablet={isTablet} />

          <View className={`mt-4 gap-4 ${isDesktop ? 'flex-row items-start' : ''}`}>
            <View className={isDesktop ? 'w-[350px]' : 'w-full'}>
              <ProfileRail />
            </View>

            <View className={`${isDesktop ? 'flex-1' : 'w-full'} gap-4`}>
              <ComposerCard />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="pr-4">
                {stories.map((item) => (
                  <StoryCard key={item.id} item={item} />
                ))}
              </ScrollView>

              {posts.map((item) => (
                <FeedPost key={item.id} item={item} />
              ))}
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
