import { ROUTES } from '@/lib/routes';
import type {
  ChatMessageResponse,
  ChatReadStatusResponse,
  CreateDirectChatRequest,
  DirectChatResponse,
  PaginatedChatMessagesResponse,
  PaginatedDirectChatsResponse,
  SendChatMessageRequest,
} from '@/lib/chat.types';
import { formatApiErrorDetail, normalizeApiUrl, type ApiUrlSource, type TokenRefreshResponse } from '@/lib/shared-api';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  hydrateAccessToken,
  setAuthTokens,
} from '@/lib/session';

import type { Comment, LikeStatus, PaginatedPosts, Post, PostLiker, Story, StoryCreatePayload, StoryViewStatus } from './types';

const FALLBACK_PORT = '8000';
const LOCALHOST_API_URL = `http://localhost:${FALLBACK_PORT}`;

export type { ApiUrlSource };

type ApiConfig = {
  url: string;
  source: ApiUrlSource;
};

type ApiErrorPayload = {
  detail?: unknown;
};

type ApiResponse = {
  data: string;
  headers: Headers;
  status: number;
};

const REFRESH_EXCLUDED_PATH_PREFIXES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

let inFlightRefreshPromise: Promise<string | null> | null = null;

function resolveApiConfig(): ApiConfig {
  const envApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

  if (envApiUrl) {
    return {
      url: envApiUrl,
      source: 'env',
    };
  }

  return {
    url: LOCALHOST_API_URL,
    source: 'fallback',
  };
}

const apiConfig = resolveApiConfig();

export const API_URL = apiConfig.url;
export const API_URL_SOURCE = apiConfig.source;

/**
 * Normalize avatar URL from backend.
 * Old records store relative paths like "/static/avatars/file.jpg".
 * New records store full URLs. This ensures we always return a usable URL.
 */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  // Relative path — prefix with backend base URL
  const hasLeadingSlash = avatarUrl.startsWith('/');
  return `${API_URL}${hasLeadingSlash ? '' : '/'}${avatarUrl}`;
}

export function resolveStaticUrl(fileUrl: string | null | undefined): string | null {
  return resolveAvatarUrl(fileUrl);
}

function canAttemptRefresh(path: string, hasCustomAuthorization: boolean): boolean {
  if (hasCustomAuthorization) {
    return false;
  }

  return !REFRESH_EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function performRequest(path: string, init: RequestInit | undefined, token: string | null): Promise<ApiResponse> {
  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  return {
    data: await response.text(),
    headers: response.headers,
    status: response.status,
  };
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function readJsonBody<T>(response: ApiResponse): T | null {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json') || !response.data) {
    return null;
  }

  try {
    return JSON.parse(response.data) as T;
  } catch {
    return null;
  }
}

async function handleExpiredSession(): Promise<void> {
  await clearAuthTokens();

  if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.login) {
    window.location.replace(ROUTES.login);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearAuthTokens();
    return null;
  }

  try {
    const response = await performRequest(
      '/api/auth/refresh',
      {
        body: JSON.stringify({ refresh_token: refreshToken }),
        method: 'POST',
      },
      null,
    );

    if (!isSuccessfulStatus(response.status)) {
      await clearAuthTokens();
      return null;
    }

    const payload = readJsonBody<TokenRefreshResponse>(response);

    if (!payload?.access_token || !payload.refresh_token) {
      await clearAuthTokens();
      return null;
    }

    await setAuthTokens(payload.access_token, payload.refresh_token);
    return payload.access_token;
  } catch {
    await clearAuthTokens();
    return null;
  }
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (inFlightRefreshPromise === null) {
    inFlightRefreshPromise = refreshAccessToken().finally(() => {
      inFlightRefreshPromise = null;
    });
  }

  return inFlightRefreshPromise;
}

export async function restoreAuthSession(): Promise<string | null> {
  const hydratedAccessToken = await hydrateAccessToken();

  if (hydratedAccessToken) {
    return hydratedAccessToken;
  }

  return refreshAccessTokenOnce();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const requestHeaders = new Headers(init?.headers);
  const hasCustomAuthorization = requestHeaders.has('Authorization');
  const shouldRefresh = canAttemptRefresh(path, hasCustomAuthorization);

  let token = hasCustomAuthorization ? null : getAccessToken();

  if (!token && shouldRefresh) {
    token = await refreshAccessTokenOnce();
  }

  let response = await performRequest(path, init, token);

  if (response.status === 401 && shouldRefresh) {
    const refreshedAccessToken = await refreshAccessTokenOnce();

    if (refreshedAccessToken) {
      token = refreshedAccessToken;
      response = await performRequest(path, init, token);
    }
  }

  if (!isSuccessfulStatus(response.status)) {
    let payloadDetail: string | null = null;
    const payload = readJsonBody<ApiErrorPayload>(response);

    if (payload) {
      payloadDetail = formatApiErrorDetail(payload.detail);
    }

    if (response.status === 401 && (token || shouldRefresh)) {
      await handleExpiredSession();
      throw new Error('Phiên đăng nhập hết hạn');
    }

    throw new Error(payloadDetail ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return readJsonBody<T>(response) as T;
}

export type HealthResponse = {
  status: string;
};

export function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

export function fetchPosts(page = 1, pageSize = 10, authorId?: string | number): Promise<PaginatedPosts> {
  let url = `/api/posts?page=${page}&page_size=${pageSize}&sort_order=desc`;
  if (authorId) {
    url += `&author_id=${authorId}`;
  }
  return apiFetch<PaginatedPosts>(url);
}

export function fetchPostDetail(postId: string): Promise<Post> {
  return apiFetch<Post>(`/api/posts/${postId}`);
}

export function likePost(postId: string, reactionType: string = 'like'): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like?reaction_type=${reactionType}`, { method: 'POST' });
}

export function unlikePost(postId: string): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like`, { method: 'DELETE' });
}

export function deletePost(postId: string): Promise<void> {
  return apiFetch<void>(`/api/posts/${postId}`, { method: 'DELETE' });
}

export type PostLikersResponse = {
  post_id: string;
  like_count: number;
  users: PostLiker[];
};

export function fetchPostLikers(postId: string): Promise<PostLikersResponse> {
  return apiFetch<PostLikersResponse>(`/api/posts/${postId}/likes`);
}

export function createPost(content: string, mediaUrls: string[] = []): Promise<Post> {
  return apiFetch<Post>('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      content,
      media_urls: mediaUrls,
    }),
  });
}

export async function uploadPostMedia(file: File): Promise<{ data: string[] }> {
  const formData = new FormData();
  formData.append('files', file);

  return apiFetch<{ data: string[] }>('/api/posts/upload-media', {
    method: 'POST',
    body: formData,
  });
}

export function fetchStories(): Promise<Story[]> {
  return apiFetch<Story[]>('/api/stories');
}

export async function uploadStoryMedia(file: File): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<{ file_url: string }>('/api/stories/upload-media', {
    method: 'POST',
    body: formData,
  });
}

export function createStory(payload: StoryCreatePayload): Promise<Story> {
  return apiFetch<Story>('/api/stories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markStoryViewed(storyId: string): Promise<StoryViewStatus> {
  return apiFetch<StoryViewStatus>(`/api/stories/${storyId}/views`, { method: 'POST' });
}

export function fetchPostComments(postId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/api/comments/post/${postId}`);
}

export function createComment(postId: string, content: string, parentCommentId: string | null = null): Promise<Comment> {
  return apiFetch<Comment>(`/api/comments/post/${postId}`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      parent_comment_id: parentCommentId,
    }),
  });
}

export function deleteComment(commentId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/comments/${commentId}`, { method: 'DELETE' });
}

export function likeComment(commentId: string): Promise<{ liked: boolean; like_count: number }> {
  return apiFetch<{ liked: boolean; like_count: number }>(`/api/comments/${commentId}/like`, { method: 'POST' });
}

export function unlikeComment(commentId: string): Promise<{ liked: boolean; like_count: number }> {
  return apiFetch<{ liked: boolean; like_count: number }>(`/api/comments/${commentId}/like`, { method: 'DELETE' });
}

export function fetchDirectChats(page = 1, pageSize = 20): Promise<PaginatedDirectChatsResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiFetch<PaginatedDirectChatsResponse>(`/api/chats?${params.toString()}`);
}

export function createDirectChat(payload: CreateDirectChatRequest): Promise<DirectChatResponse> {
  return apiFetch<DirectChatResponse>('/api/chats/direct', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchChatMessages(chatId: string, page = 1, pageSize = 30): Promise<PaginatedChatMessagesResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return apiFetch<PaginatedChatMessagesResponse>(`/api/chats/${chatId}/messages?${params.toString()}`);
}

export function createChatMessage(chatId: string, payload: SendChatMessageRequest): Promise<ChatMessageResponse> {
  return apiFetch<ChatMessageResponse>(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  gender: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export type AdminPostReport = {
  post_id: string;
  reporter_id: number;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
  post_content: string | null;
  reporter_name: string | null;
};

export type AdminPostReportsResponse = {
  items: AdminPostReport[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export async function adminFetchUsers(): Promise<AdminUser[]> {
  const response = await apiFetch<{ items: AdminUser[] }>('/api/admin/users?page_size=100');
  return response.items;
}

export function adminSetUserStatus(userId: number, isActive: boolean): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function adminFetchPostReports(
  status?: ReportStatus,
  page = 1,
  pageSize = 20,
): Promise<AdminPostReportsResponse> {
  if (status && status !== 'pending') {
    return {
      items: [],
      total: 0,
      page,
      page_size: pageSize,
      total_pages: 1,
    };
  }

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  
  type BackendReportItem = {
    post_id: number;
    user_id: number;
    reason: string | null;
    created_at: string;
    reporter: {
      id: number;
      first_name: string;
      last_name: string;
      full_name: string;
    };
    post: {
      id: number;
      content: string;
    };
  };

  const backendResponse = await apiFetch<{
    items: BackendReportItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }>(`/api/admin/reports?${params}`);

  const mappedItems: AdminPostReport[] = backendResponse.items.map((item) => ({
    post_id: String(item.post_id),
    reporter_id: item.user_id,
    reason: item.reason,
    status: 'pending',
    created_at: item.created_at,
    post_content: item.post?.content ?? null,
    reporter_name: item.reporter?.full_name ?? `${item.reporter?.first_name} ${item.reporter?.last_name}`,
  }));

  return {
    items: mappedItems,
    total: backendResponse.total,
    page: backendResponse.page,
    page_size: backendResponse.page_size,
    total_pages: backendResponse.total_pages,
  };
}

export async function adminUpdateReportStatus(
  postId: string,
  reporterId: number,
  status: ReportStatus,
): Promise<AdminPostReport> {
  if (status === 'resolved') {
    await apiFetch<void>(`/api/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  } else if (status === 'dismissed') {
    await apiFetch<void>(`/api/admin/reports/${postId}`, {
      method: 'DELETE',
    });
  }

  return {
    post_id: postId,
    reporter_id: reporterId,
    reason: null,
    status,
    created_at: new Date().toISOString(),
    post_content: null,
    reporter_name: null,
  };
}

export function markChatRead(chatId: string): Promise<ChatReadStatusResponse> {
  return apiFetch<ChatReadStatusResponse>(`/api/chats/${chatId}/read`, { method: 'POST' });
}

export function hasUnreadMessages(): Promise<boolean> {
  return apiFetch<boolean>('/api/chats/has-unread-messages');
}
