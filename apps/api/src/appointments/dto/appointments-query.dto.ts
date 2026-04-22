import { IsIn, IsOptional } from 'class-validator';

import type { AppointmentStatus } from '../../db/schema/appointments';

const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['SCHEDULED', 'CANCELLED', 'DONE'];

export class AppointmentsQueryDto {
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;
}
