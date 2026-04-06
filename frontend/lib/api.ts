import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { getAccessToken } from '@/lib/session';

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let payloadDetail: string | null = null;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      payloadDetail = formatApiErrorDetail(payload.detail);
    } catch {
      // Keep default message when body is not JSON.
    }

    if (response.status === 401 && token) {
      // Only auto-redirect when the request was authenticated.
      // For unauthenticated endpoints like /auth/login we want to surface the backend message.
      router.replace('/login');
      throw new Error('Phiên đăng nhập hết hạn');
    }

    throw new Error(payloadDetail ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export type HealthResponse = {
  status: string;
};

export function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}
