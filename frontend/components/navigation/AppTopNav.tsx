import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type AppTopNavProps = {
  isTablet: boolean;
  searchPlaceholder?: string;
  avatarInitials?: string;
  avatarUrl?: string | null;
};

import { Image } from 'react-native';
import { API_URL } from '@/lib/api';

function NavAvatar({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image 
        source={{ uri }} 
        className="h-14 w-14 rounded-[22px]" 
        style={{ width: 56, height: 56, borderRadius: 22 }}
      />
    );
  }
  return (
    <View className="h-14 w-14 items-center justify-center rounded-[22px] bg-[#EAF4FB]">
      <ThemedText className="text-base font-semibold tracking-[0.5px] text-slate-900">{initials}</ThemedText>
    </View>
  );
}

function NavActionBubble({ icon }: { icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
      <MaterialIcons color="#666666" name={icon} size={21} />
    </View>
  );
}

export function AppTopNav({
  isTablet,
  searchPlaceholder = 'Search people, notes, or screenshots',
  avatarInitials = 'LE',
  avatarUrl,
}: AppTopNavProps) {
  return (
    <ThemedView className="rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
      <View className={`items-center gap-4 ${isTablet ? 'flex-row justify-between' : 'flex-col'}`}>
        <View className={`items-center gap-4 ${isTablet ? 'flex-1 flex-row' : 'w-full flex-row'}`}>
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#4A9FD8]">
              <MaterialIcons color="#FFFFFF" name="filter-tilt-shift" size={22} />
            </View>
            <View>
              <ThemedText className="text-[26px] font-semibold tracking-[-0.5px] text-slate-950">Northfeed</ThemedText>
              <ThemedText className="text-sm text-slate-500">studio</ThemedText>
            </View>
          </View>

          <View className={`rounded-[22px] bg-[#F7F8FA] px-4 py-4 ${isTablet ? 'ml-6 max-w-[560px] flex-1' : 'w-full'}`}>
            <View className="flex-row items-center gap-3">
              <MaterialIcons color="#666666" name="search" size={20} />
              <ThemedText className="flex-1 text-base text-slate-500">{searchPlaceholder}</ThemedText>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <NavActionBubble icon="mail-outline" />
          <NavActionBubble icon="notifications-none" />
          <NavActionBubble icon="apps" />
          <Pressable onPress={() => router.push('/profile')} className="active:opacity-70">
            <NavAvatar initials={avatarInitials} avatarUrl={avatarUrl} />
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}
