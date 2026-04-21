import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';

import { InboxListItem, type InboxListItemData } from '@/components/inbox/InboxListItem';
import { MessageBubble, type MessageBubbleData } from '@/components/inbox/MessageBubble';
import { ProfilePanelStat, type ProfilePanelStatData } from '@/components/inbox/ProfilePanelStat';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const threads: InboxListItemData[] = [
  {
    id: '1',
    name: 'Lena Evere',
    preview: 'Updated the final review deck and moved three comments into the handoff.',
    time: '09:24',
    initials: 'LE',
    active: true,
    unread: 2,
  },
  {
    id: '2',
    name: 'Aya Tran',
    preview: 'I left the typography notes in the thread for round two.',
    time: '08:10',
    initials: 'AT',
  },
  {
    id: '3',
    name: 'Rafi Mercer',
    preview: 'Need one more pass on the motion pacing before sign-off.',
    time: 'Yesterday',
    initials: 'RM',
  },
  {
    id: '4',
    name: 'Nadia Elsner',
    preview: 'Profile rail content is ready whenever you want to swap copy.',
    time: 'Yesterday',
    initials: 'NE',
  },
];

const messages: MessageBubbleData[] = [
  {
    id: '1',
    body: 'Morning. I tightened the final deck and grouped the open notes by launch priority.',
    time: '09:14',
    incoming: true,
  },
  {
    id: '2',
    body: 'Looks calmer already. I want to keep the left rail dense, but the center column can breathe more.',
    time: '09:18',
  },
  {
    id: '3',
    body: 'Agreed. I also pulled the profile module into fewer blocks so the right side reads faster on mobile.',
    time: '09:20',
    incoming: true,
  },
  {
    id: '4',
    body: 'Perfect. Ship this static frame first and we can wire the states after design review.',
    time: '09:24',
  },
];

const profileDetails: ProfilePanelStatData[] = [
  { label: 'Role', value: 'Product Design Lead' },
  { label: 'Team', value: 'Northfeed Studio' },
  { label: 'Timezone', value: 'GMT+7' },
  { label: 'Response', value: 'Usually within 1 hour' },
];

const quickActions = ['View brief', 'Shared files', 'Mute thread'];

const surfaceClass = 'rounded-[28px] border border-[#E2E8F0] bg-white';

function AvatarPill({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return (
    <View
      className={`h-12 w-12 items-center justify-center rounded-[18px] ${muted ? 'bg-[#E2E8F0]' : 'bg-[#DBEAFE]'}`}>
      <ThemedText className="text-sm font-semibold tracking-[0.6px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
  className = '',
  contentClassName = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <ThemedView className={`${surfaceClass} p-5 ${className}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <ThemedText className="text-[24px] font-semibold text-slate-950">{title}</ThemedText>
          <ThemedText className="mt-1 text-sm text-slate-500">{subtitle}</ThemedText>
        </View>
      </View>
      <View className={`mt-5 gap-4 ${contentClassName}`}>{children}</View>
    </ThemedView>
  );
}

export default function InboxScreen() {
  const { width, height } = useWindowDimensions();
  const useViewportLayout = width >= 1100;
  const isTablet = width >= 768;
  const viewportPanelHeight = Math.max(height - 120, 560);
  const [searchValue, setSearchValue] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const content = (
    <ThemedView className="flex-1">
      <ThemedView className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
        <AppTopNav isTablet={isTablet} searchPlaceholder="Search inbox threads, files, or people" />

        <View className={useViewportLayout ? 'flex-row items-stretch gap-4 mt-4' : 'gap-5'} style={useViewportLayout ? { height: viewportPanelHeight } : undefined}>
          <View className={useViewportLayout ? 'w-[336px]' : isTablet ? 'w-full' : 'w-full'}>
            <SectionShell
              title="Inbox"
              subtitle="Priority threads and recent updates"
              className={useViewportLayout ? 'h-full' : ''}
              contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}>
              <View className="flex-row items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                <MaterialIcons color="#64748B" name="search" size={20} />
                <TextInput
                  className="flex-1 text-base text-slate-900"
                  onChangeText={setSearchValue}
                  placeholder="Search messages"
                  placeholderTextColor="#64748B"
                  value={searchValue}
                />
              </View>

              <ScrollView
                className={useViewportLayout ? 'min-h-0 flex-1' : ''}
                contentContainerClassName="gap-3"
                showsVerticalScrollIndicator={false}>
                {threads.map((item) => (
                  <InboxListItem key={item.id} item={item} />
                ))}
              </ScrollView>
            </SectionShell>
          </View>

          <View className={useViewportLayout ? 'min-w-0 flex-1' : 'w-full'}>
            <SectionShell
              title="Conversation"
              subtitle="Lena Evere · Final review deck"
              className={useViewportLayout ? 'h-full' : ''}
              contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}>
              <View className="flex-row items-center justify-between gap-3 rounded-[24px] bg-[#F8FAFC] px-4 py-4">
                <View className="flex-row items-center gap-3">
                  <AvatarPill initials="LE" />
                  <View>
                    <ThemedText className="text-base font-semibold text-slate-950">Lena Evere</ThemedText>
                    <ThemedText className="text-sm text-slate-500">Active 4 min ago</ThemedText>
                  </View>
                </View>
                <Pressable className="rounded-[18px] bg-white px-4 py-3 active:opacity-90">
                  <ThemedText className="text-sm font-semibold text-slate-900">Call</ThemedText>
                </Pressable>
              </View>

              <View className={`min-h-0 flex-1 rounded-[28px] bg-[#FCFDFE] px-4 py-4 ${useViewportLayout ? '' : 'min-h-[360px]'}`}>
                <ScrollView className="min-h-0 flex-1" contentContainerClassName="gap-4" showsVerticalScrollIndicator={false}>
                  {messages.map((item) => (
                    <MessageBubble key={item.id} item={item} />
                  ))}
                </ScrollView>
              </View>

              <View className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <TextInput
                  className="min-h-[72px] text-base leading-6 text-slate-900"
                  multiline
                  onChangeText={setDraftMessage}
                  placeholder="Write a reply..."
                  placeholderTextColor="#64748B"
                  textAlignVertical="top"
                  value={draftMessage}
                />
                <View className="mt-4 flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <View className="flex-row items-center gap-2">
                    {['attach-file', 'image', 'mic-none'].map((icon) => (
                      <Pressable
                        key={icon}
                        className="h-11 w-11 items-center justify-center rounded-[18px] bg-white active:opacity-90">
                        <MaterialIcons color="#475569" name={icon as keyof typeof MaterialIcons.glyphMap} size={20} />
                      </Pressable>
                    ))}
                  </View>
                  <Pressable className="rounded-[18px] bg-slate-900 px-5 py-3 active:opacity-90">
                    <ThemedText className="text-sm font-semibold text-white">Send</ThemedText>
                  </Pressable>
                </View>
              </View>
            </SectionShell>
          </View>

          <View className={useViewportLayout ? 'w-[248px]' : 'w-full'}>
            <SectionShell
              title="Profile"
              subtitle="Context and quick actions"
              className={useViewportLayout ? 'h-full' : ''}
              contentClassName={useViewportLayout ? 'min-h-0 flex-1' : ''}>
              <ScrollView className={useViewportLayout ? 'min-h-0 flex-1' : ''} showsVerticalScrollIndicator={false}>
                <View className="gap-4 pb-1">
                  <View className="overflow-hidden rounded-[24px] bg-[#DBEAFE]">
                    <View className="h-[120px] bg-[#BFDBFE]" />
                    <View className="px-4 pb-4">
                      <View className="-mt-6">
                        <AvatarPill initials="LE" muted />
                      </View>
                      <ThemedText className="mt-4 text-[24px] font-semibold text-slate-950">Lena Evere</ThemedText>
                      <ThemedText className="mt-2 text-sm leading-6 text-slate-600">
                        Leads the launch review stream and keeps the team aligned on calmer product details.
                      </ThemedText>
                    </View>
                  </View>

                  <View className="gap-3">
                    {quickActions.map((label) => (
                      <Pressable
                        key={label}
                        className="flex-row items-center justify-between rounded-[22px] bg-[#F8FAFC] px-4 py-4 active:opacity-90">
                        <ThemedText className="text-base font-medium text-slate-900">{label}</ThemedText>
                        <MaterialIcons color="#94A3B8" name="chevron-right" size={20} />
                      </Pressable>
                    ))}
                  </View>

                  <View className="gap-3">
                    {profileDetails.map((item) => (
                      <ProfilePanelStat key={item.label} item={item} />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SectionShell>
          </View>
        </View>
      </ThemedView>
    </ThemedView>
  );

  return (
    <>
      {useViewportLayout ? (
        <ThemedView className="flex-1 bg-[#F8FAFC]" style={{ minHeight: height }}>
          {content}
        </ThemedView>
      ) : (
        <ScrollView
          bounces={false}
          className="flex-1 bg-[#F8FAFC]"
          contentContainerClassName="flex-grow"
          contentContainerStyle={{ minHeight: height, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      )}
      <StatusBar style="dark" />
    </>
  );
}
