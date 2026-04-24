'use client';

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { clearAuthTokens } from '@/lib/auth/token-storage';
import {
  type StoredUser,
  clearStoredUser,
  setStoredUser,
} from '@/lib/auth/user-storage';
import { type ApiError, apiClient } from '@/lib/http';
import {
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@/lib/validators/auth';

import { AUTH_QUERY_KEY } from './use-auth';

const PROFILE_QUERY_KEY = ['users', 'me'] as const;

export type { ChangePasswordInput, UpdateProfileInput };

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export function useProfile(): UseQueryResult<PublicUser, ApiError> {
  return useQuery<PublicUser, ApiError>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => apiClient.get<PublicUser>('/users/me', { signal }),
    staleTime: 30_000,
  });
}

export function useUpdateProfile(): UseMutationResult<PublicUser, ApiError, UpdateProfileInput> {
  const queryClient = useQueryClient();

  return useMutation<PublicUser, ApiError, UpdateProfileInput>({
    mutationFn: (input) => apiClient.patch<PublicUser>('/users/me', input),
    onSuccess: (data) => {
      const stored: StoredUser = { id: data.id, name: data.name, email: data.email };
      setStoredUser(stored);
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      queryClient.setQueryData(AUTH_QUERY_KEY, stored);
    },
  });
}

export function useChangePassword(): UseMutationResult<void, ApiError, ChangePasswordInput> {
  return useMutation<void, ApiError, ChangePasswordInput>({
    mutationFn: (input) => apiClient.put<void>('/users/me/password', input),
  });
}

export function useDeleteAccount(): UseMutationResult<void, ApiError, void> {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => apiClient.delete<void>('/users/me'),
    onSuccess: () => {
      clearAuthTokens();
      clearStoredUser();
      queryClient.clear();
    },
  });
}

export interface DataExport {
  generatedAt: string;
  user: PublicUser;
  appointments: unknown[];
}

export function useExportMyData(): UseMutationResult<DataExport, ApiError, void> {
  return useMutation<DataExport, ApiError, void>({
    mutationFn: () => apiClient.get<DataExport>('/users/me/export'),
  });
}
