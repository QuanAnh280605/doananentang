import type { Method } from 'axios';
import axios from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  hydrateAccessToken,
  setAuthTokens,
} from '@/lib/session';
import type { Comment, LikeStatus, PaginatedPosts, Post } from '@/lib/types';

const FALLBACK_PORT = '8000';
const LOCALHOST_API_URL = `http://127.0.0.1:${FALLBACK_PORT}`;

export type ApiUrlSource = 'env' | 'env-localhost-rewritten' | 'native-auto' | 'fallback';

type ApiConfig = {
  url: string;
  source: ApiUrlSource;
};

type ApiErrorPayload = {
  detail?: unknown;
};

type TokenRefreshResponse = {
  access_token: string;
  refresh_token: string;
};

type ApiResponse = {
  data: string;
  headers: {
    get(name: string): string | null;
  };
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

function formatFieldLabel(value: string): string {
  const normalized = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return value;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatApiErrorDetail(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const errorItem = item as { loc?: unknown; msg?: unknown };
        if (typeof errorItem.msg !== 'string') {
          return null;
        }

        if (Array.isArray(errorItem.loc)) {
          const field = errorItem.loc[errorItem.loc.length - 1];
          if (typeof field === 'string' || typeof field === 'number') {
            return `${formatFieldLabel(String(field))}: ${errorItem.msg}`;
          }
        }

        return errorItem.msg;
      })
      .filter((message): message is string => Boolean(message));

    return messages.length ? messages.join('\n') : 'Dữ liệu không hợp lệ';
  }

  return null;
}

function normalizeApiUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/\/$/, '');
}

function isLoopbackUrl(value: string): boolean {
  return (
    value.includes('://localhost') ||
    value.includes('://127.0.0.1') ||
    value.includes('://0.0.0.0')
  );
}

function getExpoHostUri(): string | null {
  return (
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.platform?.hostUri ??
    null
  );
}

function inferNativeApiUrl(): string | null {
  const hostUri = getExpoHostUri();
  if (!hostUri) {
    return null;
  }

  const hostname = hostUri.split(':')[0];
  if (!hostname) {
    return null;
  }

  return `http://${hostname}:${FALLBACK_PORT}`;
}

function resolveApiConfig(): ApiConfig {
  const envApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

  if (envApiUrl) {
    if (Platform.OS !== 'web' && isLoopbackUrl(envApiUrl)) {
      const inferredApiUrl = inferNativeApiUrl();
      if (inferredApiUrl) {
        return {
          url: inferredApiUrl,
          source: 'env-localhost-rewritten',
        };
      }
    }

    return {
      url: envApiUrl,
      source: 'env',
    };
  }

  if (Platform.OS !== 'web') {
    const inferredApiUrl = inferNativeApiUrl();
    if (inferredApiUrl) {
      return {
        url: inferredApiUrl,
        source: 'native-auto',
      };
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return {
        url: `http://${hostname}:${FALLBACK_PORT}`,
        source: 'fallback',
      };
    }
  }

  return {
    url: LOCALHOST_API_URL,
    source: 'fallback',
  };
}

const apiConfig = resolveApiConfig();

export const API_URL = apiConfig.url;
export const API_URL_SOURCE = apiConfig.source;

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

  const requestHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });

  const response = await axios.request<string>({
    data: init?.body,
    headers: requestHeaders,
    method: init?.method as Method | undefined,
    responseType: 'text',
    signal: init?.signal,
    transformResponse: [(value) => value],
    url: `${API_URL}${path}`,
    validateStatus: () => true,
  });

  return {
    data: typeof response.data === 'string' ? response.data : '',
    headers: {
      get(name: string): string | null {
        const headerValue = response.headers[name.toLowerCase()];
        if (Array.isArray(headerValue)) {
          return headerValue.join(', ');
        }

        return headerValue ?? null;
      },
    },
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
      await clearAuthTokens();
      router.replace('/login');
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

// ─── Posts API ────────────────────────────────────────────────

export function fetchPosts(page = 1, pageSize = 10): Promise<PaginatedPosts> {
  return apiFetch<PaginatedPosts>(`/api/posts?page=${page}&page_size=${pageSize}&sort_order=desc`);
}

export function fetchPostDetail(postId: string): Promise<Post> {
  return apiFetch<Post>(`/api/posts/${postId}`);
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

export async function uploadPostMedia(uri: string): Promise<{ data: string[] }> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1] : 'jpg';
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('files', new File([blob], filename, { type: mimeType }));
  } else {
    formData.append('files', {
      uri,
      name: filename,
      type: mimeType,
    } as any);
  }

  return apiFetch<{ data: string[] }>('/api/posts/upload-media', {
    method: 'POST',
    body: formData,
  });
}

// ─── Likes API ───────────────────────────────────────────────

export function likePost(postId: string): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like`, { method: 'POST' });
}

export function unlikePost(postId: string): Promise<LikeStatus> {
  return apiFetch<LikeStatus>(`/api/posts/${postId}/like`, { method: 'DELETE' });
}

// ─── Comments API ────────────────────────────────────────────

export function fetchComments(postId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/api/comments/post/${postId}`);
}

export function createComment(postId: string, content: string, parentCommentId?: string): Promise<Comment> {
  return apiFetch<Comment>(`/api/comments/post/${postId}`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      parent_comment_id: parentCommentId ?? null,
    }),
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return apiFetch<void>(`/api/comments/${commentId}`, { method: 'DELETE' });
}

export function likeComment(commentId: string): Promise<{ is_liked: boolean; like_count: number }> {
  return apiFetch<{ is_liked: boolean; like_count: number }>(`/api/comments/${commentId}/like`, {
    method: 'POST',
  });
}

export function unlikeComment(commentId: string): Promise<{ is_liked: boolean; like_count: number }> {
  return apiFetch<{ is_liked: boolean; like_count: number }>(`/api/comments/${commentId}/like`, {
    method: 'DELETE',
  });
}
