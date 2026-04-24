export const ACCESS_TOKEN_COOKIE = 'agendia_access_token';
export const REFRESH_TOKEN_COOKIE = 'agendia_refresh_token';

const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getAccessToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return readCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return readCookie(REFRESH_TOKEN_COOKIE);
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  writeCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_MAX_AGE_SECONDS);
  writeCookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_MAX_AGE_SECONDS);
}

export function clearAuthTokens(): void {
  if (typeof document === 'undefined') {
    return;
  }
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
}

function readCookie(name: string): string | null {
  const pattern = new RegExp(`(?:^|; )${escapeRegex(name)}=([^;]*)`);
  const match = pattern.exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];
  if (window.location.protocol === 'https:') {
    parts.push('Secure');
  }
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
