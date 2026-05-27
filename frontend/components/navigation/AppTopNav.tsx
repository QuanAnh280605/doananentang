import { Aperture, EnvelopeSimple, Bell, SquaresFour, IconWeight } from 'phosphor-react-native';
import { Pressable, View, Image } from 'react-native';
import { router } from 'expo-router';

import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchInput } from '@/components/ui/SearchInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function NavAvatar({ initials, avatarUrl, size = 'large' }: { initials: string; avatarUrl?: string | null; size?: 'large' | 'small' }) {
  const sizeValue = size === 'large' ? 56 : 38;
  const radiusValue = size === 'large' ? 28 : 19;
  if (avatarUrl) {
    const uri = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return (
      <Image
        source={{ uri }}
        className="rounded-full"
        style={{ width: sizeValue, height: sizeValue, borderRadius: radiusValue }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-[#EAF4FB]"
      style={{ width: sizeValue, height: sizeValue }}
    >
      <ThemedText style={{ fontSize: size === 'large' ? 16 : 13 }} className="font-semibold tracking-[0.5px] text-slate-900">
        {initials}
      </ThemedText>
    </View>
  );
}

type IconComponent = React.ComponentType<{ size?: number; color?: string; weight?: any }>;

function NavActionBubble({ icon: Icon }: { icon: IconComponent }) {
  return (
    <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7F8FA]">
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
  const insets = useSafeAreaInsets();
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
    <ThemedView
      className={`bg-white ${isTablet ? 'rounded-surface border border-app-border px-5 pb-4' : 'px-4 pb-3'}`}
      style={[
        { paddingTop: Math.max(insets.top, 0) + (isTablet ? 16 : 10) },
        !isTablet && {
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }
      ]}
    >
      {isTablet ? (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 flex-row items-center gap-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#4A9FD8]">
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
                    onChangeText={() => { }}
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
        <View className="flex-row items-center justify-between h-12 pb-0.5">
          {/* Left Brand Logo Squircle */}
          <View className="flex-row items-center">
            <View
              className="h-10 w-10 items-center justify-center bg-[#4A9FD8]"
              style={{
                borderRadius: 12,
                shadowColor: '#4A9FD8',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Aperture color="#FFFFFF" size={21} weight="bold" />
            </View>
          </View>

          {/* Right Action Icons & Avatar */}
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              className="h-10 w-10 items-center justify-center bg-white border border-[#E2E8F0] active:opacity-75"
              style={{
                borderRadius: 12,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <Bell color="#334155" size={21} weight="regular" />
              {unreadCount > 0 && (
                <View
                  className="absolute h-2.5 w-2.5 rounded-full bg-[#EF4444] border-2 border-white"
                  style={{ top: -1, right: -1 }}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/inbox')}
              className="h-10 w-10 items-center justify-center bg-white border border-[#E2E8F0] active:opacity-75"
              style={{
                borderRadius: 12,
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <EnvelopeSimple color="#334155" size={21} weight="regular" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/profile')}
              className="active:opacity-75 ml-1"
            >
              <NavAvatar initials={avatarInitials} avatarUrl={avatarUrl} size="small" />
            </Pressable>
          </View>
        </View>
      )}
    </ThemedView>
  );
}
