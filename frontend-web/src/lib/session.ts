import { isJwtTokenValid } from '@/lib/shared-auth';

const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'auth.refreshToken';

let accessToken: string | null = null;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readPersistedToken(storageKey: string): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

function writePersistedToken(storageKey: string, token: string | null): void {
  if (!canUseStorage()) {
    return;
  }

  if (token === null) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, token);
}

function isTokenValid(token: string | null): boolean {
  return isJwtTokenValid(token);
}

export function getAccessToken(): string | null {
  if (!isTokenValid(accessToken)) {
    accessToken = null;
    return null;
  }

  return accessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  const token = readPersistedToken(REFRESH_TOKEN_STORAGE_KEY);

  if (!isTokenValid(token)) {
    if (token !== null) {
      writePersistedToken(REFRESH_TOKEN_STORAGE_KEY, null);
    }

    return null;
  }

  return token;
}

export async function hydrateAccessToken(): Promise<string | null> {
  const token = readPersistedToken(ACCESS_TOKEN_STORAGE_KEY);

  if (isTokenValid(token)) {
    accessToken = token;
  } else {
    accessToken = null;

    if (token !== null) {
      writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, null);
    }
  }

  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, token);
}

export async function setAuthTokens(nextAccessToken: string | null, refreshToken: string | null): Promise<void> {
  accessToken = nextAccessToken;
  writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, nextAccessToken);
  writePersistedToken(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export async function clearAuthTokens(): Promise<void> {
  await setAuthTokens(null, null);
}
