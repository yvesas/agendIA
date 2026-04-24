import type { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'agendia_access_token';
export const REFRESH_TOKEN_COOKIE = 'agendia_refresh_token';

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * ONE_HOUR_MS;

interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

function baseOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseOptions(ONE_HOUR_MS));
  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, baseOptions(SEVEN_DAYS_MS));
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}
