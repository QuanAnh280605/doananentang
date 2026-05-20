import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import { NotificationItem } from '@/components/notification/NotificationItem';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { surfaceClass } from '@/components/ui/core';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/lib/api';

export default function NotificationsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleItemPress = (item: Notification) => {
    if (!item.is_read) {
      markRead(item.id, true);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllRead();
    }
  };

  return (
    <ThemedView className="flex-1 bg-[#F8FAFC]">
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const nearBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
          if (nearBottom && hasMore && !loadingMore) {
            loadMore();
          }
        }}
        scrollEventThrottle={200}
      >
        <View className="mx-auto w-full max-w-[1720px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav
            isTablet={isTablet}
            searchPlaceholder="Tìm trong thông báo"
            unreadNotificationCount={unreadCount}
          />

          <View className={`mt-4 ${surfaceClass} p-5`}>
            {/* Header */}
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <ThemedText className="text-[22px] font-semibold text-slate-950">
                  Thông báo
                </ThemedText>
                {unreadCount > 0 && (
                  <View
                    style={{
                      backgroundColor: '#4A9FD8',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      minWidth: 24,
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText className="text-xs font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>

              {unreadCount > 0 && (
                <Pressable
                  id="mark-all-read-btn"
                  onPress={handleMarkAllRead}
                  className="rounded-[18px] bg-[#F1F5F9] px-4 py-2 active:opacity-80"
                >
                  <ThemedText className="text-sm font-medium text-slate-700">
                    Đánh dấu tất cả đã đọc
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Content */}
            <View className="mt-4 gap-2">
              {loading ? (
                <View className="items-center py-16">
                  <ActivityIndicator size="large" color="#4A9FD8" />
                  <ThemedText className="mt-3 text-sm text-slate-500">
                    Đang tải thông báo...
                  </ThemedText>
                </View>
              ) : error ? (
                <View className="items-center py-12">
                  <MaterialIcons color="#EF4444" name="error-outline" size={32} />
                  <ThemedText className="mt-3 text-center text-base text-slate-600">
                    {error}
                  </ThemedText>
                  <Pressable
                    id="notifications-retry-btn"
                    onPress={refresh}
                    className="mt-4 rounded-[18px] bg-[#0A0A0A] px-6 py-3 active:opacity-80"
                  >
                    <ThemedText className="text-sm font-medium text-white">Thử lại</ThemedText>
                  </Pressable>
                </View>
              ) : notifications.length === 0 ? (
                <View className="items-center py-16">
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 18,
                      backgroundColor: '#EAF4FB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons color="#4A9FD8" name="notifications-none" size={32} />
                  </View>
                  <ThemedText className="mt-4 text-[18px] font-semibold text-slate-900">
                    Chưa có thông báo
                  </ThemedText>
                  <ThemedText className="mt-2 text-center text-sm text-slate-500">
                    Khi có ai đó tương tác với bạn,{'\n'}thông báo sẽ hiển thị ở đây.
                  </ThemedText>
                </View>
              ) : (
                <>
                  {notifications.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      onPress={handleItemPress}
                    />
                  ))}

                  {/* Load more */}
                  {loadingMore && (
                    <View className="items-center py-4">
                      <ActivityIndicator size="small" color="#4A9FD8" />
                    </View>
                  )}

                  {!hasMore && notifications.length > 0 && (
                    <View className="items-center py-4">
                      <ThemedText className="text-sm text-slate-400">
                        Đã hiển thị tất cả thông báo
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
