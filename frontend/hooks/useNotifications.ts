import { useCallback, useRef, useState } from 'react';

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';
import type { Notification } from '@/lib/api';

type UseNotificationsReturn = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: number, isRead?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const PAGE_SIZE = 30;

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications(1, PAGE_SIZE);
      setNotifications(res.items);
      setUnreadCount(res.unread_count);
      setHasMore(res.page < res.total_pages);
      pageRef.current = 1;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const res = await fetchNotifications(nextPage, PAGE_SIZE);
      setNotifications((prev) => [...prev, ...res.items]);
      setHasMore(nextPage < res.total_pages);
      pageRef.current = nextPage;
    } catch {
      // silent — không hiện lỗi load more để không làm gián đoạn UI
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  const markRead = useCallback(async (id: number, isRead = true) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: isRead } : n)),
    );
    setUnreadCount((prev) => {
      const delta = isRead ? -1 : 1;
      return Math.max(0, prev + delta);
    });

    try {
      await markNotificationRead(id, isRead);
    } catch {
      // Rollback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: !isRead } : n)),
      );
      setUnreadCount((prev) => {
        const delta = isRead ? 1 : -1;
        return Math.max(0, prev + delta);
      });
    }
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    const previous = notifications;
    const previousCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      // Rollback
      setNotifications(previous);
      setUnreadCount(previousCount);
    }
  }, [notifications, unreadCount]);

  return {
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
  };
}
