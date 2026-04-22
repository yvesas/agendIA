export const AUTH_TOKEN_COOKIE = 'agendia:accessToken';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

export function getStoredToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return readCookie(AUTH_TOKEN_COOKIE);
}

export function setStoredToken(token: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  writeCookie(AUTH_TOKEN_COOKIE, token, COOKIE_MAX_AGE_SECONDS);
}

export function clearStoredToken(): void {
  if (typeof document === 'undefined') {
    return;
  }
  deleteCookie(AUTH_TOKEN_COOKIE);
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
