'use client';

import { type UseQueryResult, keepPreviousData, useQuery } from '@tanstack/react-query';

import { type ApiError, apiClient } from '@/lib/http';
import type { ExamsListResponse } from '@/types/exam';

export interface ExamsQuery {
  search: string;
  page: number;
  limit: number;
}

export function useExams(query: ExamsQuery): UseQueryResult<ExamsListResponse, ApiError> {
  return useQuery<ExamsListResponse, ApiError>({
    queryKey: ['exams', query],
    queryFn: ({ signal }) =>
      apiClient.get<ExamsListResponse>('/exams', {
        params: {
          search: query.search.length > 0 ? query.search : undefined,
          page: query.page,
          limit: query.limit,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}
