import { Injectable, NotFoundException } from '@nestjs/common';

import { type Exam } from '../db/schema/exams';

import { type ExamsQueryDto } from './dto/exams-query.dto';
import { ExamsRepository } from './exams.repository';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExamsListResponse {
  items: Exam[];
  meta: PaginationMeta;
}

@Injectable()
export class ExamsService {
  constructor(private readonly repository: ExamsRepository) {}

  async list(query: ExamsQueryDto): Promise<ExamsListResponse> {
    const { items, total } = await this.repository.findMany({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });

    return {
      items,
      meta: this.buildMeta(query, total),
    };
  }

  async findById(id: string): Promise<Exam> {
    const exam = await this.repository.findById(id);

    if (!exam) {
      throw new NotFoundException(`Exam ${id} not found`);
    }

    return exam;
  }

  private buildMeta(query: ExamsQueryDto, total: number): PaginationMeta {
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    };
  }
}
