import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import { type Exam, exams } from '../db/schema/exams';

export interface ExamsListQuery {
  search?: string;
  page: number;
  limit: number;
}

export interface ExamsListResult {
  items: Exam[];
  total: number;
}

@Injectable()
export class ExamsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findMany(query: ExamsListQuery): Promise<ExamsListResult> {
    const whereClause = this.buildWhereClause(query.search);
    const offset = (query.page - 1) * query.limit;

    const [items, totalRows] = await Promise.all([
      this.db
        .select()
        .from(exams)
        .where(whereClause)
        .orderBy(asc(exams.name))
        .limit(query.limit)
        .offset(offset),
      this.db.select({ value: count() }).from(exams).where(whereClause),
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? 0,
    };
  }

  async findById(id: string): Promise<Exam | undefined> {
    const [row] = await this.db.select().from(exams).where(eq(exams.id, id)).limit(1);
    return row;
  }

  private buildWhereClause(search: string | undefined): SQL | undefined {
    const activeFilter = eq(exams.active, true);

    if (!search || search.trim().length === 0) {
      return activeFilter;
    }

    return and(activeFilter, ilike(exams.name, `%${search.trim()}%`));
  }
}
