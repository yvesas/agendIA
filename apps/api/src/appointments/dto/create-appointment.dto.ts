import { IsISO8601, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  examId!: string;

  @IsISO8601({ strict: true })
  scheduledAt!: string;
}
