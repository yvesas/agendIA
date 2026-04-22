'use client';

import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { type ApiError, apiClient } from '@/lib/http';
import type { AppointmentWithExam } from '@/types/appointment';

export function useAppointments(): UseQueryResult<AppointmentWithExam[], ApiError> {
  return useQuery<AppointmentWithExam[], ApiError>({
    queryKey: ['appointments'],
    queryFn: ({ signal }) =>
      apiClient.get<AppointmentWithExam[]>('/appointments', { signal }),
  });
}
