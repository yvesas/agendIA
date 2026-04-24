import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from '../auth/token-storage';
import { clearStoredUser } from '../auth/user-storage';

import { ApiClient } from './api-client';

const DEFAULT_BASE_URL = 'http://localhost:3001';

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(new URL('/auth/refresh', baseUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'omit',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) {
      return null;
    }

    setAuthTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function handleSessionExpired(): void {
  clearAuthTokens();
  clearStoredUser();
  for (const listener of sessionExpiredListeners) {
    listener();
  }
}

export const apiClient = new ApiClient({
  baseUrl,
  getToken: getAccessToken,
  refreshToken: refreshAccessToken,
  onSessionExpired: handleSessionExpired,
});

export { ApiClient } from './api-client';
export { ApiError } from './api-error';
export type { QueryParams, RequestOptions } from './api-client';
