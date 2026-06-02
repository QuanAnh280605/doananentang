import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';

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
      className={`rounded-[20px] border px-4 py-4 active:opacity-90 transition-all ${item.active ? 'border-transparent bg-[#EAF4FB] shadow-sm' : 'border-slate-100/60 bg-white shadow-sm'}`}
      onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <AvatarPill initials={item.initials} avatarUrl={item.avatarUrl} />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-1.5 flex-1">
              <ThemedText className={`text-base text-slate-900 ${item.unread ? 'font-bold' : 'font-semibold'}`} numberOfLines={1}>
                {item.name}
              </ThemedText>
            </View>
            <ThemedText className="text-[11px] font-medium text-slate-400">{item.time}</ThemedText>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <ThemedText 
              className={`text-[13px] leading-5 flex-1 ${item.unread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
              numberOfLines={1}
            >
              {item.preview}
            </ThemedText>
            {item.unread ? (
              <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EF4444] px-1.5 py-0.5">
                <ThemedText className="text-[10px] font-bold text-white">
                  {item.unread}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
