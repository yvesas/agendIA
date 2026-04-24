import { getRefreshToken, setAuthTokens } from '../auth/token-storage';

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
}

export function createRefreshStrategy(baseUrl: string): () => Promise<string | null> {
  return async function refreshAccessToken(): Promise<string | null> {
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

      const data = (await response.json()) as RefreshResponse;
      if (!data.accessToken || !data.refreshToken) {
        return null;
      }

      setAuthTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  };
}
