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
});
