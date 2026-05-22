import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchNotifications } from '@/lib/api';

export type NotificationsContextValue = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  refreshUnreadCount: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetchNotifications(true); // Chỉ đếm unread hoặc fetch full
      setUnreadCount(response.unread_count);
    } catch {
      // Bỏ qua lỗi kết nối trong background
    }
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Thiết lập interval polling nhẹ mỗi 30 giây để cập nhật badge
  useEffect(() => {
    const timer = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => clearInterval(timer);
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({
    unreadCount,
    setUnreadCount,
    refreshUnreadCount,
  }), [unreadCount, refreshUnreadCount]);

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
