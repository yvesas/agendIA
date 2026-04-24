import request from 'supertest';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { authHeader, registerUser } from './helpers/factories';

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

      const response = await request(ctx.app.getHttpServer())
        .get('/users/me')
        .set(authHeader(user))
        .expect(200);

      expect(response.body).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('401 sem token', async () => {
      await request(ctx.app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('atualiza nome', async () => {
      const user = await registerUser(ctx, { name: 'Original' });

      const response = await request(ctx.app.getHttpServer())
        .patch('/users/me')
        .set(authHeader(user))
        .send({ name: 'Renomeado' })
        .expect(200);

      expect(response.body.name).toBe('Renomeado');
    });

    it('atualiza e-mail', async () => {
      const user = await registerUser(ctx);

      const response = await request(ctx.app.getHttpServer())
        .patch('/users/me')
        .set(authHeader(user))
        .send({ email: 'new@test.app' })
        .expect(200);

      expect(response.body.email).toBe('new@test.app');
    });

    it('rejeita e-mail já usado por outro usuário com 409', async () => {
      await registerUser(ctx, { email: 'occupied@test.app' });
      const user = await registerUser(ctx);

      await request(ctx.app.getHttpServer())
        .patch('/users/me')
        .set(authHeader(user))
        .send({ email: 'occupied@test.app' })
        .expect(409);
    });

    it('rejeita body vazio com 400 (refine)', async () => {
      const user = await registerUser(ctx);

      await request(ctx.app.getHttpServer())
        .patch('/users/me')
        .set(authHeader(user))
        .send({})
        .expect(400);
    });
  });

  describe('PUT /users/me/password', () => {
    it('troca a senha quando a atual está correta', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await request(ctx.app.getHttpServer())
        .put('/users/me/password')
        .set(authHeader(user))
        .send({ currentPassword: 'OldP@ss123!', newPassword: 'NewP@ss123!' })
        .expect(204);

      await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'NewP@ss123!' })
        .expect(200);
    });

    it('401 quando a senha atual está errada', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await request(ctx.app.getHttpServer())
        .put('/users/me/password')
        .set(authHeader(user))
        .send({ currentPassword: 'WrongP@ss1!', newPassword: 'NewP@ss123!' })
        .expect(401);
    });

    it('400 se a nova senha é fraca', async () => {
      const user = await registerUser(ctx, { password: 'OldP@ss123!' });

      await request(ctx.app.getHttpServer())
        .put('/users/me/password')
        .set(authHeader(user))
        .send({ currentPassword: 'OldP@ss123!', newPassword: 'weakpass' })
        .expect(400);
    });
  });

  describe('DELETE /users/me', () => {
    it('apaga a conta (LGPD) e bloqueia o token seguinte', async () => {
      const user = await registerUser(ctx);

      await request(ctx.app.getHttpServer()).delete('/users/me').set(authHeader(user)).expect(204);

      await request(ctx.app.getHttpServer()).get('/users/me').set(authHeader(user)).expect(401);
    });
  });
});
