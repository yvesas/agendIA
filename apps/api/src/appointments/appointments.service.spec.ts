import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { type Appointment } from '../db/schema/appointments';
import { type Exam } from '../db/schema/exams';
import { ExamsService } from '../exams/exams.service';

import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let repository: jest.Mocked<AppointmentsRepository>;
  let exams: jest.Mocked<ExamsService>;
  let service: AppointmentsService;

  const EXAM: Exam = {
    id: 'exam-1',
    name: 'Hemograma',
    slug: 'hemograma',
    description: '...',
    preparation: null,
    durationMin: 30,
    priceCents: 3500,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const futureIso = (): string => new Date(Date.now() + 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findManyByUser: jest.fn(),
      findOverlapping: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AppointmentsRepository>;

    exams = {
      findById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<ExamsService>;

    service = new AppointmentsService(repository, exams);
  });

  describe('create', () => {
    it('persists the appointment when the slot is free and in the future', async () => {
      const scheduledAt = futureIso();
      const created: Appointment = {
        id: 'appt-1',
        userId: 'user-1',
        examId: EXAM.id,
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      exams.findById.mockResolvedValue(EXAM);
      repository.findOverlapping.mockResolvedValue([]);
      repository.create.mockResolvedValue(created);

      const result = await service.create('user-1', {
        examId: EXAM.id,
        scheduledAt,
      });

      expect(exams.findById).toHaveBeenCalledWith(EXAM.id);
      expect(repository.findOverlapping).toHaveBeenCalledWith({
        userId: 'user-1',
        start: new Date(scheduledAt),
        end: new Date(new Date(scheduledAt).getTime() + EXAM.durationMin * 60 * 1000),
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        examId: EXAM.id,
        scheduledAt: new Date(scheduledAt),
      });
      expect(result).toBe(created);
    });

    it('rejects a scheduled time in the past with BadRequestException', async () => {
      exams.findById.mockResolvedValue(EXAM);
      const pastIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      await expect(
        service.create('user-1', { examId: EXAM.id, scheduledAt: pastIso }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.findOverlapping).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an unparseable scheduledAt string with BadRequestException', async () => {
      exams.findById.mockResolvedValue(EXAM);

      await expect(
        service.create('user-1', {
          examId: EXAM.id,
          scheduledAt: 'definitely-not-a-date',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.findOverlapping).not.toHaveBeenCalled();
    });

    it('raises ConflictException when an overlapping appointment exists', async () => {
      exams.findById.mockResolvedValue(EXAM);
      repository.findOverlapping.mockResolvedValue([
        {
          id: 'existing',
          userId: 'user-1',
          examId: EXAM.id,
          scheduledAt: new Date(),
          status: 'SCHEDULED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(
        service.create('user-1', { examId: EXAM.id, scheduledAt: futureIso() }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('bubbles up NotFoundException when the exam does not exist', async () => {
      exams.findById.mockRejectedValue(new NotFoundException('Exam x not found'));

      await expect(
        service.create('user-1', { examId: 'missing', scheduledAt: futureIso() }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.findOverlapping).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('computes the overlap window using the exam duration, not a fixed value', async () => {
      const scheduledAt = futureIso();
      const longExam: Exam = { ...EXAM, durationMin: 90 };

      exams.findById.mockResolvedValue(longExam);
      repository.findOverlapping.mockResolvedValue([]);
      repository.create.mockResolvedValue({
        id: 'appt-2',
        userId: 'user-1',
        examId: longExam.id,
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('user-1', { examId: longExam.id, scheduledAt });

      const call = repository.findOverlapping.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      const delta = (call?.end.getTime() ?? 0) - (call?.start.getTime() ?? 0);
      expect(delta).toBe(90 * 60 * 1000);
    });
  });

  describe('listByUser', () => {
    it('delegates to the repository with the given userId and status filter', async () => {
      repository.findManyByUser.mockResolvedValue([]);

      await service.listByUser('user-42', 'SCHEDULED');

      expect(repository.findManyByUser).toHaveBeenCalledWith('user-42', 'SCHEDULED');
    });
  });

  describe('cancel', () => {
    const ownerId = 'user-1';

    function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
      return {
        id: 'appt-1',
        userId: ownerId,
        examId: EXAM.id,
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        status: 'SCHEDULED',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    it('flips status to CANCELLED when scheduled and in the future', async () => {
      const existing = buildAppointment();
      const cancelled = { ...existing, status: 'CANCELLED' as const };
      repository.findById.mockResolvedValue(existing);
      repository.updateStatus.mockResolvedValue(cancelled);

      const result = await service.cancel(ownerId, existing.id);

      expect(repository.updateStatus).toHaveBeenCalledWith(existing.id, 'CANCELLED');
      expect(result).toBe(cancelled);
    });

    it('raises NotFoundException when the appointment does not exist', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.cancel(ownerId, 'missing')).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('raises ForbiddenException when the caller does not own the appointment', async () => {
      repository.findById.mockResolvedValue(buildAppointment({ userId: 'someone-else' }));

      await expect(service.cancel(ownerId, 'appt-1')).rejects.toBeInstanceOf(ForbiddenException);

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('raises ConflictException when already cancelled', async () => {
      repository.findById.mockResolvedValue(buildAppointment({ status: 'CANCELLED' }));

      await expect(service.cancel(ownerId, 'appt-1')).rejects.toBeInstanceOf(ConflictException);

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('raises ConflictException when already DONE', async () => {
      repository.findById.mockResolvedValue(buildAppointment({ status: 'DONE' }));

      await expect(service.cancel(ownerId, 'appt-1')).rejects.toBeInstanceOf(ConflictException);

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('raises ConflictException when the appointment is in the past', async () => {
      repository.findById.mockResolvedValue(
        buildAppointment({ scheduledAt: new Date(Date.now() - 60 * 60 * 1000) }),
      );

      await expect(service.cancel(ownerId, 'appt-1')).rejects.toBeInstanceOf(ConflictException);

      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('raises NotFoundException if updateStatus unexpectedly returns undefined', async () => {
      repository.findById.mockResolvedValue(buildAppointment());
      repository.updateStatus.mockResolvedValue(undefined);

      await expect(service.cancel(ownerId, 'appt-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
