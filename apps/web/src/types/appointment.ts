import type { Exam } from './exam';

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

export interface AppointmentWithExam extends Appointment {
  exam: Exam;
}

export interface CreateAppointmentInput {
  examId: string;
  scheduledAt: string;
}
