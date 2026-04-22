import { z } from 'zod';

const durationString = z
  .string()
  .regex(/^\d+(ms|s|m|h|d)$/, 'must be a duration like "15m", "7d" or "3600s"');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: durationString.default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: durationString.default('7d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(20).default(12),

  EXAMS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

export type EnvVars = z.infer<typeof envSchema>;
