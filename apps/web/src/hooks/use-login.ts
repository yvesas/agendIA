'use client';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { type StoredUser, setStoredUser } from '@/lib/auth/user-storage';
import { ApiError, apiClient } from '@/lib/http';
import { type LoginInput } from '@/lib/validators/auth';

import { AUTH_QUERY_KEY } from './use-auth';

export type { LoginInput };

interface AuthResponse {
  user: StoredUser;
}

export function useLogin(): UseMutationResult<AuthResponse, ApiError, LoginInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, ApiError, LoginInput>({
    mutationFn: (input) => apiClient.post<AuthResponse>('/auth/login', input),
    onSuccess: (data) => {
      setStoredUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });
}
