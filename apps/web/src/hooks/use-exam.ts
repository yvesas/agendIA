'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { type ApiError, apiClient } from '@/lib/http';
import type { Exam } from '@/types/exam';

export function useExam(id: string): UseQueryResult<Exam, ApiError> {
  return useQuery<Exam, ApiError>({
    queryKey: ['exams', 'detail', id],
    queryFn: ({ signal }) => apiClient.get<Exam>(`/exams/${id}`, { signal }),
    enabled: id.length > 0,
  });
}
