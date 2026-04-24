export function createRefreshStrategy(baseUrl: string): () => Promise<boolean> {
  return async function refresh(): Promise<boolean> {
    try {
      const response = await fetch(new URL('/auth/refresh', baseUrl).toString(), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
  };
}
