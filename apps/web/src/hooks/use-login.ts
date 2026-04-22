'use client';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { setStoredToken } from '@/lib/auth/token-storage';
import { type StoredUser, setStoredUser } from '@/lib/auth/user-storage';
import { ApiError, apiClient } from '@/lib/http';

import { AUTH_QUERY_KEY } from './use-auth';

export interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  user: StoredUser;
}

export function useLogin(): UseMutationResult<AuthResponse, ApiError, LoginInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, ApiError, LoginInput>({
    mutationFn: (input) => apiClient.post<AuthResponse>('/auth/login', input),
    onSuccess: (data) => {
      setStoredToken(data.accessToken);
      setStoredUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });
}
