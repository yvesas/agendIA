import { sql } from 'drizzle-orm';

import type { Database } from '../../src/db/database.module';

export async function truncateAll(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE appointments, exams, users RESTART IDENTITY CASCADE`);
}
