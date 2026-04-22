import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import {
  type Appointment,
  type AppointmentStatus,
  type NewAppointment,
  appointments,
} from '../db/schema/appointments';

@Injectable()
export class AppointmentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<Appointment | undefined> {
    const [row] = await this.db.select().from(appointments).where(eq(appointments.id, id)).limit(1);

    return row;
  }

  async findManyByUser(userId: string, status?: AppointmentStatus): Promise<Appointment[]> {
    const whereClause = status
      ? and(eq(appointments.userId, userId), eq(appointments.status, status))
      : eq(appointments.userId, userId);

    return this.db
      .select()
      .from(appointments)
      .where(whereClause)
      .orderBy(desc(appointments.scheduledAt));
  }

  async create(input: NewAppointment): Promise<Appointment> {
    const [row] = await this.db.insert(appointments).values(input).returning();

    if (!row) {
      throw new Error('Appointment insert returned no rows');
    }

    return row;
  }
}
