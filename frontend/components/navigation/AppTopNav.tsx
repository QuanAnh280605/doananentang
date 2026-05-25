import { Aperture, EnvelopeSimple, Bell, SquaresFour } from 'phosphor-react-native';
import { Pressable, View , Image} from 'react-native';
import { router } from 'expo-router';

import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchInput } from '@/components/ui/SearchInput';

import { useNotifications } from '@/hooks/useNotifications';
import { API_URL } from '@/lib/api';

type AppTopNavProps = {
  isTablet: boolean;
  searchPlaceholder?: string;
  avatarInitials?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  avatarUrl?: string | null;

};

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

type IconComponent = React.ComponentType<{ size?: number; color?: string; weight?: any }>;

function NavActionBubble({ icon: Icon }: { icon: IconComponent }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#F7F8FA]">
      <Icon color="#666666" size={21} weight="regular" />
    </View>
  );
}

export function AppTopNav({
  isTablet,
  searchPlaceholder = 'Search people, notes, or screenshots',
  avatarInitials = 'LE',
  avatarUrl,
  searchValue,
  onSearchChange,
}: AppTopNavProps) {
  const globalSearch = useGlobalSearch();
  const { unreadCount } = useNotifications();
  const isControlled = typeof onSearchChange === 'function';
  const resolvedSearchValue = isControlled ? (searchValue ?? '') : globalSearch.query;

  const handleSearchChange = (value: string) => {
    if (isControlled) {
      onSearchChange(value);
      return;
    }

    globalSearch.setQuery(value);
  };

  const handleSearchFocus = () => {
    if (!isControlled) {
      router.push('/(tabs)/explore');
    }
  };

  return (
    <ThemedView className={`bg-app-surface ${isTablet ? 'rounded-surface border border-app-border px-5 py-4' : 'px-2 py-3'}`}>
      {isTablet ? (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 flex-row items-center gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#4A9FD8]">
                <Aperture color="#FFFFFF" size={22} weight="bold" />
              </View>
              <View>
                <ThemedText className="text-[26px] font-semibold tracking-[-0.5px] text-slate-950">Northfeed</ThemedText>
                <ThemedText className="text-sm text-slate-500">studio</ThemedText>
              </View>
            </View>

            {isControlled ? (
              <SearchInput
                className="ml-6 max-w-[560px] flex-1"
                onChangeText={handleSearchChange}
                placeholder={searchPlaceholder}
                value={resolvedSearchValue}
              />
            ) : (
              <Pressable 
                className="ml-6 max-w-[560px] flex-1"
                onPress={handleSearchFocus}
              >
                <View pointerEvents="none">
                  <SearchInput
                    onChangeText={() => {}}
                    placeholder={searchPlaceholder}
                    value={resolvedSearchValue}
                  />
                </View>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            <NavActionBubble icon={EnvelopeSimple} />
            <Pressable onPress={() => router.push('/(tabs)/notifications')}>
              <View className="relative">
                <NavActionBubble icon={Bell} />
                {unreadCount > 0 && (
                  <View className="absolute -right-1 -top-1 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5">
                    <ThemedText className="text-[10px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>
            </Pressable>
            <NavActionBubble icon={SquaresFour} />
            <Pressable onPress={() => router.push('/profile')} className="active:opacity-70">
              <NavAvatar initials={avatarInitials} avatarUrl={avatarUrl} />
            </Pressable>
          </View>
        </View>
      ) : (
        /* Mobile Header */
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#4A9FD8]">
              <Aperture color="#FFFFFF" size={18} weight="bold" />
            </View>
            <ThemedText className="text-xl font-bold tracking-tight text-slate-950">Northfeed</ThemedText>
          </View>
          <View className="flex-row items-center gap-2">
             <Pressable onPress={() => router.push('/(tabs)/notifications')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-70">
                <Bell color="#0F172A" size={22} weight="regular" />
                {unreadCount > 0 && (
                  <View className="absolute right-0 top-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
                )}
             </Pressable>
             <Pressable onPress={() => router.push('/(tabs)/inbox')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:opacity-70">
                <EnvelopeSimple color="#0F172A" size={22} weight="regular" />
             </Pressable>
          </View>
        </View>
      )}
    </ThemedView>
  );
}
