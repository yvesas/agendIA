export const TEST_POSTGRES_HOST = process.env.TEST_POSTGRES_HOST ?? 'localhost';
export const TEST_POSTGRES_PORT = process.env.TEST_POSTGRES_PORT ?? '5432';
export const TEST_POSTGRES_USER = process.env.TEST_POSTGRES_USER ?? 'agendia';
export const TEST_POSTGRES_PASSWORD = process.env.TEST_POSTGRES_PASSWORD ?? 'agendia';
export const TEST_DATABASE_NAME = process.env.TEST_DATABASE_NAME ?? 'agendia_test';

export const TEST_DATABASE_URL = buildUrl(TEST_DATABASE_NAME);
export const ADMIN_DATABASE_URL = buildUrl('postgres');

function buildUrl(database: string): string {
  return `postgres://${TEST_POSTGRES_USER}:${TEST_POSTGRES_PASSWORD}@${TEST_POSTGRES_HOST}:${TEST_POSTGRES_PORT}/${database}`;
}

export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'e2e-access-secret-with-at-least-32-chars';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'e2e-refresh-secret-with-at-least-32-chars';
  process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '4';
  process.env.EXAMS_CACHE_TTL_SECONDS = process.env.EXAMS_CACHE_TTL_SECONDS ?? '1';
}
