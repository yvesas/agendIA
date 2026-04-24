import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { type Appointment, type AppointmentStatus } from '../db/schema/appointments';
import { type Exam } from '../db/schema/exams';
import { ExamsService } from '../exams/exams.service';

import { type AppointmentWithExam, AppointmentsRepository } from './appointments.repository';
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

  listByUser(userId: string, status?: AppointmentStatus): Promise<AppointmentWithExam[]> {
    return this.repository.findManyByUser(userId, status);
  }

  async cancel(userId: string, appointmentId: string): Promise<Appointment> {
    const existing = await this.repository.findById(appointmentId);

    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own appointments');
    }

    if (existing.status !== 'SCHEDULED') {
      throw new ConflictException(
        existing.status === 'CANCELLED'
          ? 'Appointment is already cancelled'
          : 'Only scheduled appointments can be cancelled',
      );
    }

    if (existing.scheduledAt.getTime() <= Date.now()) {
      throw new ConflictException('Cannot cancel a past appointment');
    }

    const updated = await this.repository.updateStatus(appointmentId, 'CANCELLED');
    if (!updated) {
      throw new NotFoundException('Appointment not found');
    }
    return updated;
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
