'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { usePathname } from 'next/navigation';

import { restoreAuthSession } from '@/lib/api';
import type { ChatMessageResponse } from '@/lib/chat.types';
import type { NotificationItem } from '@/lib/notification.types';
import { fetchNotifications } from '@/lib/notifications';
import { getAccessToken, subscribeToAuthSessionChanges } from '@/lib/session';
import { connectAppSocket, disconnectAppSocket, getConnectedAppSocket } from '@/lib/socket';
import { hasUnreadMessages } from '@/lib/chat';
import { getCurrentUserIdFromToken } from '@/lib/shared-auth';

type RealtimeProviderProps = {
  children: ReactNode;
};

type PresenceChangedPayload = {
  user_id: number;
  is_online: boolean;
};

type OnlineUsersSnapshotPayload = {
  user_ids: number[];
};

type RealtimeContextValue = {
  isUserOnline: (userId: number) => boolean;
  hasNewMessage: boolean;
  setHasNewMessage: Dispatch<SetStateAction<boolean>>;
  unreadNotificationCount: number;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  refreshNotificationsBadge: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtimePresence(): RealtimeContextValue {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error('useRealtimePresence must be used within RealtimeProvider');
  }

  return context;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(() => new Set());
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const refreshNotificationsBadge = useCallback(async () => {
    const response = await fetchNotifications({ unreadOnly: true, limit: 1 });
    setUnreadNotificationCount(response.unread_count);
  }, []);

  const isUserOnline = useCallback((userId: number) => onlineUserIds.has(userId), [onlineUserIds]);
  const value = useMemo<RealtimeContextValue>(() => (
    {
      isUserOnline,
      hasNewMessage,
      setHasNewMessage,
      unreadNotificationCount,
      setUnreadNotificationCount,
      refreshNotificationsBadge,
    }),
    [
      isUserOnline,
      hasNewMessage,
      setHasNewMessage,
      unreadNotificationCount,
      setUnreadNotificationCount,
      refreshNotificationsBadge,
    ]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const handleGlobalMessageCreated = (payload: ChatMessageResponse) => {
      const token = getAccessToken();
      const currentUserId = getCurrentUserIdFromToken(token);

      if (payload.sender_id !== currentUserId) {
        setHasNewMessage(true);
      }
    };

    const handleNotificationCreated = (payload: NotificationItem) => {
      const token = getAccessToken();
      const currentUserId = getCurrentUserIdFromToken(token);

      if (!currentUserId || payload.receiver_id !== currentUserId) {
        return;
      }

      setUnreadNotificationCount((currentCount) => currentCount + 1);
    };

    const handleOnlineUsersSnapshot = (payload: OnlineUsersSnapshotPayload) => {
      setOnlineUserIds(new Set(payload.user_ids));
    };

    const handleUserPresenceChanged = (payload: PresenceChangedPayload) => {
      setOnlineUserIds((currentUserIds) => {
        const nextUserIds = new Set(currentUserIds);

        if (payload.is_online) {
          nextUserIds.add(payload.user_id);
        } else {
          nextUserIds.delete(payload.user_id);
        }

        return nextUserIds;
      });
    };

    const syncSocketConnection = () => {
      if (getAccessToken()) {
        const socket = connectAppSocket();
        if (socket) {
          socket.off('message-created', handleGlobalMessageCreated);
          socket.off('notification-created', handleNotificationCreated);
          socket.off('online-users-snapshot', handleOnlineUsersSnapshot);
          socket.off('user-presence-changed', handleUserPresenceChanged);
          socket.on('message-created', handleGlobalMessageCreated);
          socket.on('notification-created', handleNotificationCreated);
          socket.on('online-users-snapshot', handleOnlineUsersSnapshot);
          socket.on('user-presence-changed', handleUserPresenceChanged);
        }

        void refreshNotificationsBadge().catch(() => undefined);
        return;
      }

      setUnreadNotificationCount(0);
      disconnectAppSocket();
    };

    restoreAuthSession()
      .then((token) => {
        if (!isMounted || !token) {
          syncSocketConnection();
          return;
        }

        syncSocketConnection();
        hasUnreadMessages().then(setHasNewMessage).catch(() => undefined);
      })
      .catch(() => {
        setUnreadNotificationCount(0);
        disconnectAppSocket();
      });

    const unsubscribe = subscribeToAuthSessionChanges(syncSocketConnection);

    return () => {
      isMounted = false;
      unsubscribe();
      const socket = getConnectedAppSocket();
      socket?.off('message-created', handleGlobalMessageCreated);
      socket?.off('notification-created', handleNotificationCreated);
      socket?.off('online-users-snapshot', handleOnlineUsersSnapshot);
      socket?.off('user-presence-changed', handleUserPresenceChanged);
      disconnectAppSocket();
    };
  }, [refreshNotificationsBadge]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
