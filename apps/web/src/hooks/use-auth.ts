'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { clearStoredToken } from '@/lib/auth/token-storage';
import {
  type StoredUser,
  clearStoredUser,
  getStoredUser,
} from '@/lib/auth/user-storage';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => getStoredUser(),
    initialData: () => getStoredUser(),
    staleTime: Infinity,
  });

  const user = data ?? null;

  const logout = useCallback(() => {
    clearStoredToken();
    clearStoredUser();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.clear();
    router.push('/login');
  }, [queryClient, router]);

  return {
    user,
    isAuthenticated: user !== null,
    logout,
  };
}
