import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type InboxListItemData = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  active?: boolean;
  unread?: number;
};

function AvatarPill({ initials }: { initials: string }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#DBEAFE]">
      <ThemedText className="text-sm font-semibold tracking-[0.6px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

export function InboxListItem({ item }: { item: InboxListItemData }) {
  return (
    <Pressable
      className={`rounded-[24px] border px-4 py-4 active:opacity-90 ${item.active ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-transparent bg-[#F8FAFC]'}`}>
      <View className="flex-row items-start gap-3">
        <AvatarPill initials={item.initials} />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-3">
            <ThemedText className="text-base font-semibold text-slate-950">{item.name}</ThemedText>
            <ThemedText className="text-xs font-medium text-slate-400">{item.time}</ThemedText>
          </View>
          <ThemedText className="text-sm leading-6 text-slate-500">{item.preview}</ThemedText>
        </View>
      </View>
      {item.unread ? (
        <View className="mt-3 self-start rounded-full bg-slate-900 px-2.5 py-1">
          <ThemedText className="text-xs font-semibold text-white">{item.unread} new</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}
