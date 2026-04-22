import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { type Appointment, type AppointmentStatus } from '../db/schema/appointments';
import { type Exam } from '../db/schema/exams';
import { ExamsService } from '../exams/exams.service';

import { AppointmentsRepository } from './appointments.repository';
import { type CreateAppointmentDto } from './dto/create-appointment.dto';

const MS_PER_MINUTE = 60 * 1000;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository,
    private readonly exams: ExamsService,
  ) {}

  async create(userId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const exam = await this.exams.findById(dto.examId);
    const scheduledAt = this.parseFutureDate(dto.scheduledAt);

    await this.ensureNoConflict(userId, scheduledAt, exam);

    return this.repository.create({
      userId,
      examId: exam.id,
      scheduledAt,
    });
  }

  listByUser(userId: string, status?: AppointmentStatus): Promise<Appointment[]> {
    return this.repository.findManyByUser(userId, status);
  }

  private parseFutureDate(raw: string): Date {
    const scheduledAt = new Date(raw);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt is not a valid date');
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    return scheduledAt;
  }

  private async ensureNoConflict(userId: string, scheduledAt: Date, exam: Exam): Promise<void> {
    const end = new Date(scheduledAt.getTime() + exam.durationMin * MS_PER_MINUTE);

    const conflicts = await this.repository.findOverlapping({
      userId,
      start: scheduledAt,
      end,
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Time conflicts with an existing appointment');
    }
  }
}
