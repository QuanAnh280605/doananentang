import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/core';
import type { Notification, NotificationType } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────

function buildActionText(type: NotificationType, actorName: string): string {
  switch (type) {
    case 'like':
      return `${actorName} đã thích bài viết của bạn`;
    case 'comment':
      return `${actorName} đã bình luận về bài viết của bạn`;
    case 'follow':
      return `${actorName} đã bắt đầu theo dõi bạn`;
    case 'message':
      return `${actorName} đã gửi tin nhắn cho bạn`;
    case 'tag':
      return `${actorName} đã nhắc đến bạn`;
    default:
      return `${actorName} đã tương tác với bạn`;
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(isoString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function buildInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'UN';
}

// ─── Component ────────────────────────────────────────────────

type NotificationItemProps = {
  item: Notification;
  onPress: (item: Notification) => void;
};

export function NotificationItem({ item, onPress }: NotificationItemProps) {
  const initials = buildInitials(item.actor.first_name, item.actor.last_name);
  const actionText = buildActionText(item.type, item.actor.full_name);
  const timeText = formatRelativeTime(item.created_at);
  const bgColor = item.is_read ? '#F8FAFC' : '#EAF4FB';

  return (
    <Pressable
      id={`notification-item-${item.id}`}
      onPress={() => onPress(item)}
      className="active:opacity-80"
      style={{ backgroundColor: bgColor, borderRadius: 24, padding: 14 }}
    >
      <View className="flex-row items-center gap-3">
        {/* Avatar */}
        <Avatar
          initials={initials}
          avatarUrl={item.actor.avatar_url}
          soft
        />

        {/* Content */}
        <View className="flex-1 gap-0.5">
          <ThemedText
            className="text-base font-medium leading-[22px] text-slate-900"
            numberOfLines={2}
          >
            {actionText}
          </ThemedText>
          <ThemedText className="text-sm text-slate-500">
            {timeText}
          </ThemedText>
        </View>

        {/* Unread dot */}
        {!item.is_read && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#4A9FD8',
              flexShrink: 0,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
