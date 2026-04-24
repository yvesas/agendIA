import { NotFoundException } from '@nestjs/common';

import { type Exam } from '../db/schema/exams';

import { ExamsQueryDto } from './dto/exams-query.dto';
import { ExamsRepository } from './exams.repository';
import { ExamsService } from './exams.service';

describe('ExamsService', () => {
  let repository: jest.Mocked<ExamsRepository>;
  let service: ExamsService;

  const EXAM: Exam = {
    id: 'exam-1',
    name: 'Hemograma',
    slug: 'hemograma',
    description: 'Avaliação...',
    preparation: null,
    durationMin: 30,
    priceCents: 3500,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<ExamsRepository>;

    service = new ExamsService(repository);
  });

  function buildQuery(overrides: Partial<ExamsQueryDto> = {}): ExamsQueryDto {
    const query = new ExamsQueryDto();
    query.page = 1;
    query.limit = 10;
    Object.assign(query, overrides);
    return query;
  }

  describe('list', () => {
    it('forwards filters to the repository and builds pagination meta', async () => {
      repository.findMany.mockResolvedValue({ items: [EXAM], total: 1 });

      const result = await service.list(buildQuery({ search: 'hemo', page: 1, limit: 10 }));

      expect(repository.findMany).toHaveBeenCalledWith({
        search: 'hemo',
        page: 1,
        limit: 10,
      });
      expect(result.items).toEqual([EXAM]);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('computes totalPages using ceil over limit', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 23 });

      const result = await service.list(buildQuery({ page: 2, limit: 10 }));

      expect(result.meta.totalPages).toBe(3);
    });

    it('returns totalPages = 0 when there are no items', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      const result = await service.list(buildQuery());

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findById', () => {
    it('returns the exam when found', async () => {
      repository.findById.mockResolvedValue(EXAM);

      const result = await service.findById(EXAM.id);

      expect(result).toBe(EXAM);
    });

    it('throws NotFoundException when the exam is missing', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findById('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
