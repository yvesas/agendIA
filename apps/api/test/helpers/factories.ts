import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';

import type { Database } from '../../src/db/database.module';
import { type NewExam, exams } from '../../src/db/schema/exams';

import type { TestAppContext } from './app';

export interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  agent: TestAgent;
}

const DEFAULT_EXAM: NewExam = {
  name: 'Hemograma Completo',
  slug: 'hemograma-completo-e2e',
  description: 'Exame de sangue',
  preparation: null,
  durationMin: 15,
  priceCents: 5000,
};

export async function seedExam(
  db: Database,
  overrides: Partial<NewExam> = {},
): Promise<{ id: string; slug: string; durationMin: number }> {
  const values: NewExam = { ...DEFAULT_EXAM, ...overrides };
  const [row] = await db.insert(exams).values(values).returning();
  if (!row) throw new Error('seedExam: insert returned no rows');
  return { id: row.id, slug: row.slug, durationMin: row.durationMin };
}

export async function registerUser(
  ctx: TestAppContext,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<RegisteredUser> {
  const payload = {
    name: overrides.name ?? 'E2E User',
    email:
      overrides.email ?? `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.app`,
    password: overrides.password ?? 'Str0ng@Pass!',
  };

  const agent = request.agent(ctx.app.getHttpServer());
  const response = await agent.post('/auth/register').send(payload).expect(201);

  const body = response.body as {
    user: { id: string; email: string; name: string };
  };

  return {
    id: body.user.id,
    email: body.user.email,
    name: body.user.name,
    agent,
  };
}

export function futureIso(offsetMs = 24 * 60 * 60 * 1000): string {
  return new Date(Date.now() + offsetMs).toISOString();
}
