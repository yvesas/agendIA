import request from 'supertest';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { registerUser } from './helpers/factories';

describe('Users (e2e)', () => {
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

  describe('GET /users/me', () => {
    it('retorna dados do usuário autenticado (sem passwordHash)', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent.get('/users/me').expect(200);

      expect(response.body).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('401 sem cookie', async () => {
      await request(ctx.app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('atualiza nome', async () => {
      const user = await registerUser(ctx, { name: 'Original' });

      const response = await user.agent.patch('/users/me').send({ name: 'Renomeado' }).expect(200);

      expect(response.body.name).toBe('Renomeado');
    });

    it('atualiza e-mail', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent
        .patch('/users/me')
        .send({ email: 'new@test.app' })
        .expect(200);

      expect(response.body.email).toBe('new@test.app');
    });

    it('rejeita e-mail já usado por outro usuário com 409', async () => {
      await registerUser(ctx, { email: 'occupied@test.app' });
      const user = await registerUser(ctx);

      await user.agent.patch('/users/me').send({ email: 'occupied@test.app' }).expect(409);
    });

    it('rejeita body vazio com 400 (refine)', async () => {
      const user = await registerUser(ctx);

      await user.agent.patch('/users/me').send({}).expect(400);
    });
  });

  describe('PUT /users/me/password', () => {
    it('troca a senha quando a atual está correta', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await user.agent
        .put('/users/me/password')
        .send({ currentPassword: 'OldP@ss123!', newPassword: 'NewP@ss123!' })
        .expect(204);

      await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'NewP@ss123!' })
        .expect(200);
    });

    it('401 quando a senha atual está errada', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await user.agent
        .put('/users/me/password')
        .send({ currentPassword: 'WrongP@ss1!', newPassword: 'NewP@ss123!' })
        .expect(401);
    });

    it('400 se a nova senha é fraca', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await user.agent
        .put('/users/me/password')
        .send({ currentPassword: 'OldP@ss123!', newPassword: 'weakpass' })
        .expect(400);
    });
  });

  describe('DELETE /users/me', () => {
    it('apaga a conta (LGPD) e bloqueia o token seguinte', async () => {
      const user = await registerUser(ctx);

      await user.agent.delete('/users/me').expect(204);

      await user.agent.get('/users/me').expect(401);
    });
  });

  describe('GET /users/me/export', () => {
    it('retorna user + agendamentos + timestamp ISO', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent.get('/users/me/export').expect(200);

      expect(response.body).toEqual({
        generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        appointments: [],
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('401 sem cookie', async () => {
      await request(ctx.app.getHttpServer()).get('/users/me/export').expect(401);
    });
  });

  describe('GET /users/me/sessions', () => {
    it('retorna a sessão atual com ip/userAgent/lastUsedAt', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent
        .get('/users/me/sessions')
        .set('User-Agent', 'jest-e2e')
        .expect(200);

      expect(response.body).toHaveLength(1);
      const session = response.body[0];
      expect(session).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          createdAt: expect.any(String),
          ip: expect.any(String),
          userAgent: 'agendia-e2e-suite',
        }),
      );
    });

    it('separa sessões por usuário', async () => {
      const alice = await registerUser(ctx, { email: `a-${Date.now()}@test.app` });
      const bob = await registerUser(ctx, { email: `b-${Date.now()}@test.app` });

      const alices = await alice.agent.get('/users/me/sessions').expect(200);
      const bobs = await bob.agent.get('/users/me/sessions').expect(200);

      expect(alices.body).toHaveLength(1);
      expect(bobs.body).toHaveLength(1);
      expect(alices.body[0].id).not.toBe(bobs.body[0].id);
    });
  });

  describe('DELETE /users/me/sessions/:id', () => {
    it('revoga sessão própria — refresh do token revogado passa a falhar', async () => {
      const user = await registerUser(ctx);
      const list = await user.agent.get('/users/me/sessions').expect(200);
      const sessionId = list.body[0].id;

      await user.agent.delete(`/users/me/sessions/${sessionId}`).expect(204);

      // O access token ainda está válido até expirar, mas o refresh
      // associado à sessão revogada não consegue mais rotacionar.
      await user.agent.post('/auth/refresh').expect(401);

      const after = await user.agent.get('/users/me/sessions').expect(200);
      expect(after.body).toHaveLength(0);
    });

    it('403 ao tentar revogar sessão de outro usuário', async () => {
      const alice = await registerUser(ctx, { email: `a2-${Date.now()}@test.app` });
      const bob = await registerUser(ctx, { email: `b2-${Date.now()}@test.app` });
      const bobSessions = await bob.agent.get('/users/me/sessions').expect(200);
      const bobSessionId = bobSessions.body[0].id;

      await alice.agent.delete(`/users/me/sessions/${bobSessionId}`).expect(403);
    });

    it('404 para id inexistente', async () => {
      const user = await registerUser(ctx);

      await user.agent
        .delete('/users/me/sessions/11111111-2222-4333-8444-555555555555')
        .expect(404);
    });

    it('400 para id não-UUID', async () => {
      const user = await registerUser(ctx);

      await user.agent.delete('/users/me/sessions/not-a-uuid').expect(400);
    });
  });
});
