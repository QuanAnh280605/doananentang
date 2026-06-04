import { Aperture, EnvelopeSimple, Bell, User, SignOut } from 'phosphor-react-native';
import { Pressable, View, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';

import { useGlobalSearch } from '@/components/search/GlobalSearchProvider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchInput } from '@/components/ui/SearchInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '@/hooks/useNotifications';
import { API_URL } from '@/lib/api';
import { logoutUser, fetchCurrentUser, type AuthUser } from '@/lib/auth';

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser).catch(() => {});
  }, []);

  const handleOpenProfile = () => {
    setIsMenuOpen(false);
    router.push('/profile');
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsMenuOpen(false);
      router.replace('/(auth)/login');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
      className={`bg-white/90 ${isTablet ? 'rounded-surface px-5 pb-4' : 'px-4 pb-3.5'}`}
      style={[
        { paddingTop: Math.max(insets.top, 0) + (isTablet ? 16 : 12) },
        !isTablet && {
          borderRadius: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 3,
        }
      ]}
    >
      {isTablet ? (
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 flex-row items-center gap-4">
            <Pressable onPress={() => setIsMenuOpen(true)} className="active:opacity-75">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#4A9FD8]">
                  <Aperture color="#FFFFFF" size={22} weight="bold" />
                </View>
                <View>
                  <ThemedText className="text-[26px] font-semibold tracking-[-0.5px] text-slate-950">Northfeed</ThemedText>
                  <ThemedText className="text-sm text-slate-500">studio</ThemedText>
                </View>
              </View>
            </Pressable>

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
            <Pressable onPress={() => router.push('/profile')} className="active:opacity-70">
              <NavAvatar initials={avatarInitials} avatarUrl={avatarUrl} />
            </Pressable>
          </View>
        </View>
      ) : (
        /* Mobile Header */
        <View className="flex-row items-center justify-between h-12 pb-0.5">
          {/* Left Brand Logo Squircle */}
          <Pressable onPress={() => setIsMenuOpen(true)} className="active:opacity-75">
            <View className="flex-row items-center gap-2">
              <View
                className="h-10 w-10 items-center justify-center bg-[#4A9FD8]"
                style={{
                  borderRadius: 14,
                  shadowColor: '#4A9FD8',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Aperture color="#FFFFFF" size={20} weight="bold" />
              </View>
              <ThemedText className="text-[18px] font-bold tracking-[-0.3px] text-slate-900">
                Northfeed
              </ThemedText>
            </View>
          </Pressable>

          {/* Right Action Icons & Avatar */}
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push('/(tabs)/notifications')}
              className="h-10 w-10 items-center justify-center bg-[#F7F8FA] active:opacity-75"
              style={{
                borderRadius: 14,
              }}
            >
              <Bell color="#475569" size={20} weight="regular" />
              {unreadCount > 0 && (
                <View
                  className="absolute h-2.5 w-2.5 rounded-full bg-[#EF4444] border-[1.5px] border-white"
                  style={{ top: 2, right: 2 }}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/inbox')}
              className="h-10 w-10 items-center justify-center bg-[#F7F8FA] active:opacity-75"
              style={{
                borderRadius: 14,
              }}
            >
              <EnvelopeSimple color="#475569" size={20} weight="regular" />
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

      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <TouchableWithoutFeedback>
              <View 
                className="w-full max-w-[340px] bg-white border border-[#E4E8EE] p-5"
                style={{
                  borderRadius: 32,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 18 },
                  shadowOpacity: 0.08,
                  shadowRadius: 40,
                  elevation: 10,
                }}
              >
                {/* User Info Header */}
                <View className="items-center pb-4">
                  <View className="mb-3">
                    <NavAvatar 
                      initials={
                        currentUser
                          ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
                          : avatarInitials
                      } 
                      avatarUrl={currentUser?.avatar_url || avatarUrl} 
                      size="large" 
                    />
                  </View>
                  <ThemedText className="text-[20px] font-bold text-slate-950 text-center">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Người dùng'}
                  </ThemedText>
                  <ThemedText className="text-sm text-slate-500 mt-1 text-center">
                    {currentUser?.email || currentUser?.phone || 'Northfeed Member'}
                  </ThemedText>
                </View>

                {/* Divider */}
                <View className="h-[1px] bg-[#E4E8EE] w-full my-1" />

                {/* Menu Options */}
                <View className="mt-3 gap-2">
                  <Pressable
                    onPress={handleOpenProfile}
                    className="flex-row items-center gap-3 rounded-[18px] px-4 py-3 bg-slate-50 active:bg-slate-100 transition-colors"
                    style={{ minHeight: 48 }}
                  >
                    <User size={20} color="#475569" weight="bold" />
                    <ThemedText className="text-base font-semibold text-slate-700">
                      Trang cá nhân
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    className="flex-row items-center gap-3 rounded-[18px] px-4 py-3 bg-rose-50/50 active:bg-rose-50 transition-colors"
                    style={{ minHeight: 48 }}
                  >
                    {isLoggingOut ? (
                      <ActivityIndicator size="small" color="#E11D48" />
                    ) : (
                      <SignOut size={20} color="#E11D48" weight="bold" />
                    )}
                    <ThemedText className="text-base font-semibold text-rose-600">
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}
