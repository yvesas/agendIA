import { type NextRequest, NextResponse } from 'next/server';

import { REFRESH_TOKEN_COOKIE } from '@/lib/auth/token-storage';

export function proxy(request: NextRequest): NextResponse {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/appointments/:path*', '/profile/:path*'],
};
