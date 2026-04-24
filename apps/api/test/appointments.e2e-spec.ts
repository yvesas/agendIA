import request from 'supertest';

import { appointments } from '../src/db/schema/appointments';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { authHeader, futureIso, registerUser, seedExam } from './helpers/factories';

describe('Appointments (e2e)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.db);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('POST /appointments', () => {
    it('cria agendamento para horário futuro', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-create-1' });

      const response = await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({ examId: exam.id, scheduledAt: futureIso() })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: user.id,
        examId: exam.id,
        status: 'SCHEDULED',
      });
    });

    it('rejeita horário no passado com 400', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-past-1' });

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({
          examId: exam.id,
          scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        })
        .expect(400);
    });

    it('rejeita sobreposição com 409', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-overlap-1', durationMin: 30 });
      const at = futureIso(24 * 60 * 60 * 1000);

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({ examId: exam.id, scheduledAt: at })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({
          examId: exam.id,
          scheduledAt: new Date(new Date(at).getTime() + 10 * 60 * 1000).toISOString(),
        })
        .expect(409);
    });

    it('401 sem token', async () => {
      const exam = await seedExam(ctx.db, { slug: 'e2e-unauth-1' });

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .send({ examId: exam.id, scheduledAt: futureIso() })
        .expect(401);
    });
  });

  describe('GET /appointments', () => {
    it('retorna apenas os próprios agendamentos', async () => {
      const alice = await registerUser(ctx, { email: `alice-${Date.now()}@test.app` });
      const bob = await registerUser(ctx, { email: `bob-${Date.now()}@test.app` });
      const exam = await seedExam(ctx.db, { slug: 'e2e-list-1' });

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(alice))
        .send({ examId: exam.id, scheduledAt: futureIso(3 * 60 * 60 * 1000) })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(bob))
        .send({ examId: exam.id, scheduledAt: futureIso(5 * 60 * 60 * 1000) })
        .expect(201);

      const response = await request(ctx.app.getHttpServer())
        .get('/appointments')
        .set(authHeader(alice))
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(alice.id);
    });
  });

  describe('PATCH /appointments/:id/cancel', () => {
    it('cancela agendamento próprio e futuro', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-cancel-1' });

      const created = await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({ examId: exam.id, scheduledAt: futureIso() })
        .expect(201);

      const response = await request(ctx.app.getHttpServer())
        .patch(`/appointments/${created.body.id}/cancel`)
        .set(authHeader(user))
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('403 quando não é o dono', async () => {
      const owner = await registerUser(ctx, { email: `owner-${Date.now()}@test.app` });
      const intruder = await registerUser(ctx, { email: `intruder-${Date.now()}@test.app` });
      const exam = await seedExam(ctx.db, { slug: 'e2e-cancel-owner' });

      const created = await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(owner))
        .send({ examId: exam.id, scheduledAt: futureIso() })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/appointments/${created.body.id}/cancel`)
        .set(authHeader(intruder))
        .expect(403);
    });

    it('409 se já cancelado', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-cancel-twice' });

      const created = await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({ examId: exam.id, scheduledAt: futureIso() })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .patch(`/appointments/${created.body.id}/cancel`)
        .set(authHeader(user))
        .expect(200);

      await request(ctx.app.getHttpServer())
        .patch(`/appointments/${created.body.id}/cancel`)
        .set(authHeader(user))
        .expect(409);
    });

    it('409 se o agendamento já é passado', async () => {
      const user = await registerUser(ctx);
      const exam = await seedExam(ctx.db, { slug: 'e2e-cancel-past' });

      const created = await request(ctx.app.getHttpServer())
        .post('/appointments')
        .set(authHeader(user))
        .send({ examId: exam.id, scheduledAt: futureIso(60 * 60 * 1000) })
        .expect(201);

      await ctx.db
        .update(appointments)
        .set({ scheduledAt: new Date(Date.now() - 60 * 1000) })
        .where(appointmentsByIdEq(created.body.id));

      await request(ctx.app.getHttpServer())
        .patch(`/appointments/${created.body.id}/cancel`)
        .set(authHeader(user))
        .expect(409);
    });

    it('404 para id inexistente', async () => {
      const user = await registerUser(ctx);

      await request(ctx.app.getHttpServer())
        .patch('/appointments/11111111-2222-4333-8444-555555555555/cancel')
        .set(authHeader(user))
        .expect(404);
    });

    it('400 para id não-UUID', async () => {
      const user = await registerUser(ctx);

      await request(ctx.app.getHttpServer())
        .patch('/appointments/not-a-uuid/cancel')
        .set(authHeader(user))
        .expect(400);
    });
  });
});

// Helper inline para evitar mais imports em um único uso.
import { eq } from 'drizzle-orm';
function appointmentsByIdEq(id: string) {
  return eq(appointments.id, id);
}
