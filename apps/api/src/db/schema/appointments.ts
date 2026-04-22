import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { exams } from './exams';
import { users } from './users';

export const appointmentStatus = pgEnum('appointment_status', ['SCHEDULED', 'CANCELLED', 'DONE']);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'restrict' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    status: appointmentStatus('status').notNull().default('SCHEDULED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('appointments_user_scheduled_unique').on(table.userId, table.scheduledAt),
    index('appointments_scheduled_at_idx').on(table.scheduledAt),
    index('appointments_user_id_idx').on(table.userId),
  ],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
