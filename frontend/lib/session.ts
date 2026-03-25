import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { Platform } from 'react-native';

const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';

let accessToken: string | null = null;

function readWebAccessToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function writeWebAccessToken(token: string | null): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (token === null) {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

async function readPersistedAccessToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return readWebAccessToken();
    }

    return await SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to restore access token', error);
    return null;
  }
}

async function writePersistedAccessToken(token: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      writeWebAccessToken(token);
      return;
    }

    if (token === null) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
      return;
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn('Unable to persist access token', error);
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

export async function hydrateAccessToken(): Promise<string | null> {
  const token = await readPersistedAccessToken();
  if (isTokenValid(token)) {
    accessToken = token;
  } else {
    accessToken = null;
    if (token !== null) {
      await writePersistedAccessToken(null);
    }
  }
  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  await writePersistedAccessToken(token);
}
