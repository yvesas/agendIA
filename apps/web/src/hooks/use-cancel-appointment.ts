'use client';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiClient } from '@/lib/http';
import type { Appointment } from '@/types/appointment';

export function useCancelAppointment(): UseMutationResult<Appointment, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation<Appointment, ApiError, string>({
    mutationFn: (appointmentId) =>
      apiClient.patch<Appointment>(`/appointments/${appointmentId}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
