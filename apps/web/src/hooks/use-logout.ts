'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { clearAuthTokens } from '@/lib/auth/token-storage';
import { clearStoredUser } from '@/lib/auth/user-storage';

import { AUTH_QUERY_KEY } from './use-auth';

interface UseLogoutReturn {
  logout: () => void;
  logoutSilent: (redirectTo?: string) => void;
}

export function useLogout(): UseLogoutReturn {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const clear = useCallback(() => {
    clearAuthTokens();
    clearStoredUser();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(() => {
    clear();
    toast.success('Sessão encerrada.');
    router.push(buildLoginPath(pathname));
  }, [clear, router, pathname]);

  const logoutSilent = useCallback(
    (redirectTo?: string) => {
      clear();
      router.replace(redirectTo ?? buildLoginPath(pathname));
    },
    [clear, router, pathname],
  );

  return { logout, logoutSilent };
}

function buildLoginPath(currentPath: string | null): string {
  if (!currentPath || currentPath === '/login') {
    return '/login';
  }
  return `/login?from=${encodeURIComponent(currentPath)}`;
}
