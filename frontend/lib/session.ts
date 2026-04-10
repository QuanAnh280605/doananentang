import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { Platform } from 'react-native';

const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'auth.refreshToken';

let accessToken: string | null = null;

function readWebToken(storageKey: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(storageKey);
}

function writeWebToken(storageKey: string, token: string | null): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (token === null) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, token);
}

async function readPersistedToken(storageKey: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return readWebToken(storageKey);
    }

    return await SecureStore.getItemAsync(storageKey);
  } catch (error) {
    console.warn(`Unable to restore token for ${storageKey}`, error);
    return null;
  }
}

async function writePersistedToken(storageKey: string, token: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      writeWebToken(storageKey, token);
      return;
    }

    if (token === null) {
      await SecureStore.deleteItemAsync(storageKey);
      return;
    }

    await SecureStore.setItemAsync(storageKey, token);
  } catch (error) {
    console.warn(`Unable to persist token for ${storageKey}`, error);
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    // JWT exp is in seconds, Date.now() is in milliseconds
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getAccessToken(): string | null {
  if (!isTokenValid(accessToken)) {
    accessToken = null;
    return null;
  }
  return accessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  const token = await readPersistedToken(REFRESH_TOKEN_STORAGE_KEY);
  if (!isTokenValid(token)) {
    if (token !== null) {
      await writePersistedToken(REFRESH_TOKEN_STORAGE_KEY, null);
    }
    return null;
  }

  return token;
}

export async function hydrateAccessToken(): Promise<string | null> {
  const token = await readPersistedToken(ACCESS_TOKEN_STORAGE_KEY);
  if (isTokenValid(token)) {
    accessToken = token;
  } else {
    accessToken = null;
    if (token !== null) {
      await writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, null);
    }
  }
  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  await writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, token);
}

export async function setAuthTokens(nextAccessToken: string | null, refreshToken: string | null): Promise<void> {
  accessToken = nextAccessToken;
  await Promise.all([
    writePersistedToken(ACCESS_TOKEN_STORAGE_KEY, nextAccessToken),
    writePersistedToken(REFRESH_TOKEN_STORAGE_KEY, refreshToken),
  ]);
}

export async function clearAuthTokens(): Promise<void> {
  await setAuthTokens(null, null);
}
