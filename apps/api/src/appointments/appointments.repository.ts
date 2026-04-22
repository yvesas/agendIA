import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, lt, ne, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import {
  type Appointment,
  type AppointmentStatus,
  type NewAppointment,
  appointments,
} from '../db/schema/appointments';
import { type Exam, exams } from '../db/schema/exams';

export interface OverlapWindow {
  userId: string;
  start: Date;
  end: Date;
}

export interface AppointmentWithExam extends Appointment {
  exam: Exam;
}

@Injectable()
export class AppointmentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<Appointment | undefined> {
    const [row] = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);

    return row;
  }

  async findManyByUser(userId: string, status?: AppointmentStatus): Promise<AppointmentWithExam[]> {
    const whereClause = status
      ? and(eq(appointments.userId, userId), eq(appointments.status, status))
      : eq(appointments.userId, userId);

    const rows = await this.db
      .select()
      .from(appointments)
      .innerJoin(exams, eq(appointments.examId, exams.id))
      .where(whereClause)
      .orderBy(desc(appointments.scheduledAt));

    return rows.map((row) => ({ ...row.appointments, exam: row.exams }));
  }

  async findOverlapping({ userId, start, end }: OverlapWindow): Promise<Appointment[]> {
    const rows = await this.db
      .select()
      .from(appointments)
      .innerJoin(exams, eq(appointments.examId, exams.id))
      .where(
        and(
          eq(appointments.userId, userId),
          ne(appointments.status, 'CANCELLED'),
          lt(appointments.scheduledAt, end),
          sql`${appointments.scheduledAt} + make_interval(mins => ${exams.durationMin}) > ${start}`,
        ),
      );

    return rows.map((row) => row.appointments);
  }

  async create(input: NewAppointment): Promise<Appointment> {
    const [row] = await this.db.insert(appointments).values(input).returning();

    if (!row) {
      throw new Error('Appointment insert returned no rows');
    }

    return row;
  }
}
