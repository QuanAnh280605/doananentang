'use client';

import { Bell, Check, SpinnerGap, WarningCircle, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useRealtimePresence } from '@/components/providers/RealtimeProvider';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { ThemedText } from '@/components/ui/ThemedText';
import { elevatedSurfaceClass } from '@/components/ui/design-system';
import { useToast } from '@/hooks/useToast';
import type { NotificationItem } from '@/lib/notification.types';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';
import { ROUTES } from '@/lib/routes';

type NotificationsModalProps = {
  open: boolean;
  onClose: () => void;
};

function resolveNotificationHref(item: NotificationItem): string | null {
  const postId = item.post_id ?? item.target_post_id;

  if (postId) {
    return `/post/${postId}`;
  }

  if (item.related_user_id) {
    return ROUTES.profileDetail(String(item.related_user_id));
  }

  return null;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-[14px] bg-[var(--surface-muted)]" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-4 w-full animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<number | null>(null);
  const {
    unreadNotificationCount,
    setUnreadNotificationCount,
    refreshNotificationsBadge,
  } = useRealtimePresence();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchNotifications();
      setItems(response.items);
      setUnreadNotificationCount(response.unread_count);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể tải thông báo lúc này.';
      setErrorMessage(message);
      void refreshNotificationsBadge().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }, [refreshNotificationsBadge, setUnreadNotificationCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadNotifications, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const hasUnreadItems = items.some((item) => !item.is_read);

  const handleMarkAllRead = async () => {
    if (!hasUnreadItems || isMarkingAllRead) {
      return;
    }

    setIsMarkingAllRead(true);

    try {
      const response = await markAllNotificationsRead();
      setItems(response.items);
      setUnreadNotificationCount(0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể đánh dấu toàn bộ thông báo đã đọc.';
      toast.error(message);
      void refreshNotificationsBadge().catch(() => undefined);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (pendingItemId === item.id) {
      return;
    }

    setPendingItemId(item.id);

    try {
      if (!item.is_read) {
        await markNotificationRead(item.id);
        setItems((currentItems) => currentItems.map((currentItem) => (
          currentItem.id === item.id ? { ...currentItem, is_read: true } : currentItem
        )));
        setUnreadNotificationCount((currentCount) => Math.max(0, currentCount - 1));
      }

      const href = resolveNotificationHref(item);

      if (href) {
        router.push(href);
        onClose();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể mở thông báo này.';
      toast.error(message);
      void refreshNotificationsBadge().catch(() => undefined);
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Đóng thông báo"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[8px]"
        onClick={onClose}
        type="button"
      />

      <div className={`${elevatedSurfaceClass} relative z-10 flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden bg-[var(--surface)]`}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 md:px-6">
          <div>
            <ThemedText as="h3" className="text-[20px] font-bold tracking-tight text-[var(--text)]">
              Thông báo
            </ThemedText>
            <ThemedText as="p" className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">
              {unreadNotificationCount > 0 ? `${unreadNotificationCount} chưa đọc` : 'Mọi cập nhật mới sẽ hiện ở đây'}
            </ThemedText>
          </div>

          <div className="flex items-center gap-2">
            {hasUnreadItems ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-[18px] bg-[var(--accent-soft)] px-4 text-[14px] font-semibold text-[var(--accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isMarkingAllRead}
                onClick={handleMarkAllRead}
                type="button"
              >
                {isMarkingAllRead ? (
                  <span className="inline-flex items-center gap-2">
                    <SpinnerGap className="animate-spin" size={16} weight="bold" />
                    Đang cập nhật
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} weight="bold" />
                    Mark all as read
                  </span>
                )}
              </button>
            ) : null}

            <button
              aria-label="Đóng"
              className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              onClick={onClose}
              type="button"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        <div className="min-h-[360px] overflow-y-auto px-4 py-4 md:px-5">
          {loading ? (
            <LoadingRows />
          ) : errorMessage ? (
            <div className="flex min-h-[328px] flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--surface)] text-[var(--danger)]">
                <WarningCircle size={26} weight="fill" />
              </div>
              <ThemedText as="p" className="mt-5 text-[20px] font-bold text-[var(--text)]">
                Không tải được thông báo
              </ThemedText>
              <ThemedText as="p" className="mt-2 max-w-sm text-[14px] leading-6 text-[var(--text-muted)]">
                {errorMessage}
              </ThemedText>
              <button
                className="mt-5 inline-flex h-11 items-center justify-center rounded-[18px] bg-[var(--accent)] px-5 text-[14px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
                onClick={() => void loadNotifications()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[328px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--surface)] text-[var(--accent)]">
                <Bell size={24} weight="fill" />
              </div>
              <ThemedText as="p" className="mt-5 text-[20px] font-bold text-[var(--text)]">
                Chưa có thông báo
              </ThemedText>
              <ThemedText as="p" className="mt-2 max-w-sm text-[14px] leading-6 text-[var(--text-muted)]">
                Khi có lượt thích, bình luận hoặc theo dõi mới, bạn sẽ thấy chúng tại đây.
              </ThemedText>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <NotificationListItem
                  key={item.id}
                  disabled={pendingItemId === item.id}
                  item={item}
                  onClick={handleOpenNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
