import { Aperture, EnvelopeSimple, Bell, SquaresFour, MagnifyingGlass, IconWeight } from 'phosphor-react-native';
import { Pressable, View, Image, Platform } from 'react-native';
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

type IconComponent = React.ComponentType<{ size?: number; color?: string; weight?: IconWeight }>;

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
  const { unreadCount, unreadChatCount } = useNotifications();
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
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        (document.activeElement as HTMLElement)?.blur?.();
      }
      router.push('/(tabs)/explore');
    }
  };

  const handleNav = (path: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.();
    }
    router.push(path);
  };

  return (
    <ThemedView
      style={[
        isTablet ? {
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: Math.max(insets.top, 0) + 16,
          backgroundColor: '#FFFFFF',
        } : {
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginHorizontal: 0,
          marginTop: Math.max(insets.top, 0) + 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 6px 16px rgba(15, 23, 42, 0.08)',
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
            <Pressable onPress={() => handleNav('/(tabs)/inbox')} className="active:opacity-75">
              <View className="relative">
                <NavActionBubble icon={EnvelopeSimple} />
                {unreadChatCount > 0 && (
                  <View className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#EF4444] border-2 border-white" />
                )}
              </View>
            </Pressable>
            <Pressable onPress={() => handleNav('/(tabs)/notifications')}>
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
            <Pressable onPress={() => handleNav('/profile')} className="active:opacity-70">
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
                boxShadow: '0px 3px 5px rgba(74, 159, 216, 0.25)',
              }}
            >
              <Aperture color="#FFFFFF" size={21} weight="bold" />
            </View>
          </View>

          {/* Right Action Icons & Avatar */}
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => handleNav('/(tabs)/explore')}
              className="h-10 w-10 items-center justify-center bg-white border border-[#E2E8F0] active:opacity-75"
              style={{
                borderRadius: 12,
                boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.03)',
              }}
            >
              <MagnifyingGlass color="#334155" size={21} weight="regular" />
            </Pressable>

            <Pressable
              onPress={() => handleNav('/(tabs)/notifications')}
              className="h-10 w-10 items-center justify-center bg-white border border-[#E2E8F0] active:opacity-75"
              style={{
                borderRadius: 12,
                boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.03)',
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
              onPress={() => handleNav('/(tabs)/inbox')}
              className="h-10 w-10 items-center justify-center bg-white border border-[#E2E8F0] active:opacity-75"
              style={{
                borderRadius: 12,
                boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.03)',
              }}
            >
              <EnvelopeSimple color="#334155" size={21} weight="regular" />
              {unreadChatCount > 0 && (
                <View
                  className="absolute h-2.5 w-2.5 rounded-full bg-[#EF4444] border-2 border-white"
                  style={{ top: -1, right: -1 }}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => handleNav('/profile')}
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
