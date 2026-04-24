'use client';

import { useQuery } from '@tanstack/react-query';

import { type StoredUser, getStoredUser } from '@/lib/auth/user-storage';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const { data } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => getStoredUser(),
    initialData: () => getStoredUser(),
    staleTime: Infinity,
  });

  const user = data ?? null;

  return {
    user,
    isAuthenticated: user !== null,
  };
}
