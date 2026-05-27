import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchNotifications } from '@/lib/api';
import { connectAppSocket } from '@/lib/socket';

export type NotificationsContextValue = {
  unreadCount: number;
  unreadChatCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setUnreadChatCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetchNotifications(true); // Chỉ đếm unread hoặc fetch full
      setUnreadCount(response.unread_count);

      // Fetch has-unread-messages check from chats API
      const { apiFetch } = await import('@/lib/api');
      const hasUnread = await apiFetch<boolean>('/api/chats/has-unread-messages');
      setUnreadChatCount(hasUnread ? 1 : 0);
    } catch {
      // Bỏ qua lỗi kết nối trong background
    }
  }, []);

  // Fetch unread count on mount and connect Socket realtime
  useEffect(() => {
    refreshUnreadCount();

    const socket = connectAppSocket();
    if (!socket) return;

    const handleGlobalMessageCreated = () => {
      setUnreadChatCount(1);
    };

    const handleNotificationCreated = () => {
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('message-created', handleGlobalMessageCreated);
    socket.on('notification-created', handleNotificationCreated);

    return () => {
      socket.off('message-created', handleGlobalMessageCreated);
      socket.off('notification-created', handleNotificationCreated);
    };
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({
    unreadCount,
    unreadChatCount,
    setUnreadCount,
    setUnreadChatCount,
    refreshUnreadCount,
  }), [unreadCount, unreadChatCount, refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
