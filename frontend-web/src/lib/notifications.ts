import { apiFetch } from '@/lib/api';

import type { NotificationItem, NotificationListResponse } from './notification.types';

export type FetchNotificationsParams = {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

function buildNotificationsQuery(params: FetchNotificationsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.unreadOnly !== undefined) {
    searchParams.set('unread_only', String(params.unreadOnly));
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function fetchNotifications(params: FetchNotificationsParams = {}): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>(`/api/notifications${buildNotificationsQuery(params)}`);
}

export function markNotificationRead(notificationId: number | string): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead(): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>('/api/notifications/read-all', {
    method: 'PATCH',
  });
}
