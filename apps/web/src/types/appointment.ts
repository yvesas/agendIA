export type AppointmentStatus = 'SCHEDULED' | 'CANCELLED' | 'DONE';

export interface Appointment {
  id: string;
  userId: string;
  examId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  examId: string;
  scheduledAt: string;
}
