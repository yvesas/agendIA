'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { clearAuthTokens } from '@/lib/auth/token-storage';
import {
  type StoredUser,
  clearStoredUser,
  getStoredUser,
} from '@/lib/auth/user-storage';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  logout: (options?: { silent?: boolean; redirectTo?: string }) => void;
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => getStoredUser(),
    initialData: () => getStoredUser(),
    staleTime: Infinity,
  });

  const user = data ?? null;

  const logout = useCallback(
    (options?: { silent?: boolean; redirectTo?: string }) => {
      clearAuthTokens();
      clearStoredUser();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();

      if (!options?.silent) {
        toast.success('Sessão encerrada.');
      }

      const target =
        options?.redirectTo ??
        `/login${pathname && pathname !== '/login' ? `?from=${encodeURIComponent(pathname)}` : ''}`;
      router.push(target);
    },
    [queryClient, router, pathname],
  );

  return {
    user,
    isAuthenticated: user !== null,
    logout,
  };
}
