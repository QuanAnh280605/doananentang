import { ROUTES } from '@/lib/routes';
import { formatApiErrorDetail, normalizeApiUrl, type ApiUrlSource, type TokenRefreshResponse } from '@/lib/shared-api';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  hydrateAccessToken,
  setAuthTokens,
} from '@/lib/session';

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
  return `${API_URL}${avatarUrl}`;
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

import type { PaginatedPosts, Post, LikeStatus } from './types';

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

export function likePost(postId: string): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like`, { method: 'POST' });
}

export function unlikePost(postId: string): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like`, { method: 'DELETE' });
}

export function deletePost(postId: string): Promise<void> {
  return apiFetch<void>(`/api/posts/${postId}`, { method: 'DELETE' });
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

import type { Comment } from './types';

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
