'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { clearStoredUser } from '@/lib/auth/user-storage';
import { apiClient } from '@/lib/http';

import { AUTH_QUERY_KEY } from './use-auth';

interface UseLogoutReturn {
  logout: () => void;
  logoutSilent: (redirectTo?: string) => void;
}

export function useLogout(): UseLogoutReturn {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const clear = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logout é best-effort — se a API estiver fora ou o token já expirou,
      // o cliente ainda deve ficar deslogado localmente.
    }
    clearStoredUser();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(() => {
    void clear().then(() => {
      toast.success('Sessão encerrada.');
      router.push(buildLoginPath(pathname));
    });
  }, [clear, router, pathname]);

  const logoutSilent = useCallback(
    (redirectTo?: string) => {
      void clear().then(() => {
        router.replace(redirectTo ?? buildLoginPath(pathname));
      });
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
