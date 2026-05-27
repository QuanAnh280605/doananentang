import { Pressable, View, Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { API_URL } from '@/lib/api';

export type InboxListItemData = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  avatarUrl?: string | null;
  bio?: string;
  active?: boolean;
  unread?: number;
};

function AvatarPill({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image
        source={{ uri }}
        className="h-12 w-12 rounded-[18px] bg-slate-200 border border-slate-200"
        style={{ width: 48, height: 48 }}
      />
    );
  }
  return (
    <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#DBEAFE]">
      <ThemedText className="text-sm font-semibold tracking-[0.6px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

export function InboxListItem({ item, onPress }: { item: InboxListItemData; onPress?: () => void }) {
  return (
    <Pressable
      className={`rounded-[24px] border px-4 py-4 active:opacity-90 ${item.active ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-transparent bg-[#F8FAFC]'}`}
      onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <AvatarPill initials={item.initials} avatarUrl={item.avatarUrl} />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-1.5 flex-1">
              <ThemedText className={`text-base text-slate-950 ${item.unread ? 'font-bold' : 'font-semibold'}`} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {item.unread ? (
                <View className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              ) : null}
            </View>
            <ThemedText className="text-xs font-medium text-slate-400">{item.time}</ThemedText>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <ThemedText 
              className={`text-sm leading-6 flex-1 ${item.unread ? 'font-bold text-slate-900' : 'text-slate-500'}`}
              numberOfLines={1}
            >
              {item.preview}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
