import path from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { ADMIN_DATABASE_URL, TEST_DATABASE_NAME, TEST_DATABASE_URL, applyTestEnv } from './env';

export default async function globalSetup(): Promise<void> {
  applyTestEnv();

  await ensureFreshTestDatabase();
  await runMigrations();
}

async function ensureFreshTestDatabase(): Promise<void> {
  const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
  try {
    await admin`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = ${TEST_DATABASE_NAME} AND pid <> pg_backend_pid();
    `;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}"`);
    await admin.unsafe(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
  } finally {
    await admin.end();
  }
}

async function runMigrations(): Promise<void> {
  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = path.resolve(__dirname, '..', 'src', 'db', 'migrations');
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}
