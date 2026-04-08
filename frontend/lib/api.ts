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

const FALLBACK_PORT = '8000';
const LOCALHOST_API_URL = `http://localhost:${FALLBACK_PORT}`;

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

async function performRequest(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearAuthTokens();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      await clearAuthTokens();
      return null;
    }

    const payload = (await response.json()) as TokenRefreshResponse;
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

  if (!response.ok) {
    let payloadDetail: string | null = null;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      payloadDetail = formatApiErrorDetail(payload.detail);
    } catch {
      // Keep default message when body is not JSON.
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

  return (await response.json()) as T;
}

export type HealthResponse = {
  status: string;
};

export function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}
