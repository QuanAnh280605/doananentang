import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar, surfaceClass } from '@/components/ui/core';
import { useToast } from '@/hooks/useToast';
import { useNotifications } from '@/hooks/useNotifications';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import type { NotificationRead } from '@/lib/api';

type FilterType = 'all' | 'unread';

export default function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      // Gọi API lấy toàn bộ notifications (hoặc filter theo unread_only)
      const response = await fetchNotifications(filter === 'unread');
      setNotifications(response.items);
      refreshUnreadCount();
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải danh sách thông báo');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [filter, refreshUnreadCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('Đã đánh dấu đọc tất cả thông báo');
      // Cập nhật UI local
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      refreshUnreadCount();
    } catch (err: any) {
      toast.error(err.message ?? 'Đã xảy ra lỗi khi đánh dấu đọc tất cả');
    }
  };

  const handleNotificationPress = async (item: NotificationRead) => {
    // Nếu chưa đọc, gọi API mark read
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        // Cập nhật UI local
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        refreshUnreadCount();
      } catch {
        // Bỏ qua lỗi gọi API mark read âm thầm để không ảnh hưởng điều hướng
      }
    }

    // Điều hướng dựa trên loại thông báo
    if (item.type === 'message') {
      router.push('/(tabs)/inbox');
    } else if (item.type === 'follow') {
      router.push({
        pathname: '/profile/[userId]',
        params: { userId: item.actor_id },
      });
    } else if (item.type === 'like' || item.type === 'comment') {
      const targetPostId = item.post_id || item.target_post_id;
      if (targetPostId) {
        router.push({
          pathname: '/(post)/[id]',
          params: { id: targetPostId },
        });
      }
    }
  };

  // Helper sinh initials cho avatar
  const getInitials = (name?: string | null) => {
    if (!name) return 'US';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper build text hiển thị thông báo
  const getNotificationText = (item: NotificationRead) => {
    const name = item.actor_name || 'Ai đó';
    switch (item.type) {
      case 'follow':
        return `${name} đã bắt đầu theo dõi bạn`;
      case 'like':
        return item.comment_id
          ? `${name} đã thích bình luận của bạn`
          : `${name} đã thích bài viết của bạn`;
      case 'comment':
        return item.comment_id && item.post_id !== item.target_post_id
          ? `${name} đã phản hồi bình luận của bạn`
          : `${name} đã bình luận về bài viết của bạn`;
      case 'message':
        return `${name} đã gửi một tin nhắn cho bạn`;
      default:
        return `${name} đã tương tác với bạn`;
    }
  };

  // Helper định dạng icon phù hợp loại thông báo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return { name: 'person-add', color: '#4A9FD8', bg: '#D9ECF8' };
      case 'like':
        return { name: 'favorite', color: '#F24822', bg: '#FEE2E2' };
      case 'comment':
        return { name: 'chat-bubble', color: '#874FFF', bg: '#EDE9FE' };
      case 'message':
        return { name: 'mail', color: '#10B981', bg: '#D1FAE5' };
      default:
        return { name: 'notifications', color: '#4A9FD8', bg: '#D9ECF8' };
    }
  };

  // Helper tính thời gian cách hiện tại
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return 'Hôm qua';
      return `${diffDays} ngày trước`;
    } catch {
      return '';
    }
  };

  return (
    <ThemedView className="flex-1 bg-[#EDF1F5]">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="mx-auto w-full max-w-[1200px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav isTablet={isTablet} searchPlaceholder="Search notifications" />

          {/* Tiêu đề & Nút bấm header */}
          <View className="mt-6 flex-row items-center justify-between gap-3 px-1">
            <ThemedText className="text-[32px] font-bold text-slate-950">Thông báo</ThemedText>
            {notifications.some((n) => !n.is_read) && (
              <Pressable
                onPress={handleMarkAllRead}
                className="flex-row items-center gap-1.5 rounded-[18px] bg-slate-900 px-4 py-2.5 active:opacity-80">
                <MaterialIcons name="done-all" size={16} color="#FFFFFF" />
                <ThemedText className="text-sm font-semibold text-white">Đọc tất cả</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Thanh bộ lọc (Tabs Filter) */}
          <View className="mt-5 flex-row gap-2 px-1">
            {(['all', 'unread'] as FilterType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setFilter(t)}
                className={`rounded-[18px] px-5 py-3 ${
                  filter === t ? 'bg-[#4A9FD8]' : 'bg-[#E2E8F0]'
                } active:opacity-90`}>
                <ThemedText
                  className={`text-sm font-semibold ${
                    filter === t ? 'text-white' : 'text-slate-700'
                  }`}>
                  {t === 'all' ? 'Tất cả' : 'Chưa đọc'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Nội dung danh sách */}
          <ThemedView className={`${surfaceClass} mt-5 p-5`}>
            {loading ? (
              <View className="items-center py-16">
                <ActivityIndicator size="large" color="#4A9FD8" />
                <ThemedText className="mt-3 text-sm text-slate-500">Đang tải thông báo...</ThemedText>
              </View>
            ) : error ? (
              <View className="items-center py-12">
                <MaterialIcons color="#D05B5B" name="error-outline" size={36} />
                <ThemedText className="mt-3 text-center text-base text-slate-600">{error}</ThemedText>
                <Pressable
                  onPress={() => loadNotifications(true)}
                  className="mt-5 rounded-[18px] bg-slate-900 px-6 py-3 active:opacity-80">
                  <ThemedText className="text-sm font-semibold text-white">Thử lại</ThemedText>
                </Pressable>
              </View>
            ) : notifications.length === 0 ? (
              <View className="items-center py-16 gap-3">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F1F5F9]">
                  <MaterialIcons color="#94A3B8" name="notifications-none" size={32} />
                </View>
                <ThemedText className="text-base font-medium text-slate-500">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc nào' : 'Bạn chưa có thông báo nào'}
                </ThemedText>
              </View>
            ) : (
              <View className="gap-3">
                {notifications.map((item) => {
                  const icon = getNotificationIcon(item.type);
                  return (
                    <Pressable
                      key={String(item.id)}
                      onPress={() => handleNotificationPress(item)}
                      className={`flex-row items-center gap-4 rounded-[22px] p-4 ${
                        item.is_read ? 'bg-[#F7F8FA]' : 'bg-[#EAF4FB]'
                      } active:opacity-90`}>
                      
                      {/* Avatar actor */}
                      <View className="relative">
                        <Avatar
                          initials={getInitials(item.actor_name)}
                          avatarUrl={item.actor_avatar_url}
                          soft
                        />
                        {/* Biểu tượng nhỏ loại thông báo góc dưới */}
                        <View
                          className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                          style={{ backgroundColor: icon.bg }}>
                          <MaterialIcons name={icon.name as any} size={11} color={icon.color} />
                        </View>
                      </View>

                      {/* Chi tiết nội dung */}
                      <View className="flex-1 gap-1">
                        <ThemedText
                          className={`text-base leading-6 text-slate-900 ${
                            item.is_read ? 'font-normal' : 'font-semibold'
                          }`}>
                          {getNotificationText(item)}
                        </ThemedText>
                        <ThemedText className="text-xs text-slate-500">
                          {formatTimeAgo(item.created_at)}
                        </ThemedText>
                      </View>

                      {/* Dấu chấm xanh báo chưa đọc */}
                      {!item.is_read && (
                        <View className="h-3 w-3 rounded-full bg-[#4A9FD8]" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ThemedView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
