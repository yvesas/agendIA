import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const exams = pgTable(
  'exams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    preparation: text('preparation'),
    durationMin: integer('duration_min').notNull(),
    priceCents: integer('price_cents').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('exams_slug_unique').on(table.slug),
    index('exams_name_idx').on(table.name),
  ],
);

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
