'use client';

import { Bell, ChatCircleDots, Heart, UserPlus } from '@phosphor-icons/react';

import { ThemedText } from '@/components/ui/ThemedText';
import type { NotificationItem } from '@/lib/notification.types';

type NotificationListItemProps = {
  item: NotificationItem;
  disabled?: boolean;
  onClick: (item: NotificationItem) => void | Promise<void>;
};

function getNotificationCopy(item: NotificationItem): string {
  const actorName = item.actor_name?.trim() || 'Ai đó';

  if (item.type === 'like') {
    const target = item.comment_id ? 'bình luận' : 'bài viết';
    return `${actorName} đã thích ${target} của bạn`;
  }

  if (item.type === 'comment') {
    return `${actorName} đã bình luận về nội dung của bạn`;
  }

  if (item.type === 'follow') {
    return `${actorName} đã theo dõi bạn`;
  }

  return 'Bạn có thông báo mới';
}

function formatNotificationTime(createdAt: string): string {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return '';
  }

  const diffMs = createdTime - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

function NotificationTypeIcon({ type }: { type: NotificationItem['type'] }) {
  if (type === 'like') {
    return <Heart size={18} weight="fill" />;
  }

  if (type === 'comment') {
    return <ChatCircleDots size={18} weight="fill" />;
  }

  if (type === 'follow') {
    return <UserPlus size={18} weight="fill" />;
  }

  return <Bell size={18} weight="fill" />;
}

export function NotificationListItem({ item, disabled = false, onClick }: NotificationListItemProps) {
  const isUnread = !item.is_read;

  return (
    <button
      className={`flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-colors ${
        isUnread
          ? 'border-[var(--border)] bg-[var(--accent-soft)] hover:opacity-90'
          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
      } ${disabled ? 'cursor-wait opacity-70' : ''}`}
      disabled={disabled}
      onClick={() => onClick(item)}
      type="button"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--surface)] text-[var(--accent)]">
        <NotificationTypeIcon type={item.type} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <ThemedText as="p" className="text-[15px] font-semibold leading-6 text-[var(--text)]">
            {getNotificationCopy(item)}
          </ThemedText>
          {isUnread ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" /> : null}
        </div>

        <ThemedText as="p" className="mt-2 text-[13px] font-medium text-[var(--text-muted)]">
          {formatNotificationTime(item.created_at)}
        </ThemedText>
      </div>
    </button>
  );
}
