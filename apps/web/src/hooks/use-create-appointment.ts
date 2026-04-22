'use client';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiClient } from '@/lib/http';
import type { Appointment, CreateAppointmentInput } from '@/types/appointment';

export function useCreateAppointment(): UseMutationResult<
  Appointment,
  ApiError,
  CreateAppointmentInput
> {
  const queryClient = useQueryClient();

  return useMutation<Appointment, ApiError, CreateAppointmentInput>({
    mutationFn: (input) => apiClient.post<Appointment>('/appointments', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
