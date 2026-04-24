'use client';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { setAuthTokens } from '@/lib/auth/token-storage';
import { type StoredUser, setStoredUser } from '@/lib/auth/user-storage';
import { ApiError, apiClient } from '@/lib/http';
import { type RegisterInput } from '@/lib/validators/auth';

import { AUTH_QUERY_KEY } from './use-auth';

export type { RegisterInput };

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

export function useRegister(): UseMutationResult<AuthResponse, ApiError, RegisterInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, ApiError, RegisterInput>({
    mutationFn: (input) => apiClient.post<AuthResponse>('/auth/register', input),
    onSuccess: (data) => {
      setAuthTokens(data.accessToken, data.refreshToken);
      setStoredUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });
}
