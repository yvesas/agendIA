'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { ApiError } from '@/lib/http';

const DEFAULT_STALE_TIME_MS = 60 * 1000;
const MAX_RETRIES = 1;
const CLIENT_ERROR_FLOOR = 400;
const CLIENT_ERROR_CEILING = 500;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isClientError(error)) {
            return false;
          }
          return failureCount < MAX_RETRIES;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function isClientError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= CLIENT_ERROR_FLOOR &&
    error.status < CLIENT_ERROR_CEILING
  );
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
