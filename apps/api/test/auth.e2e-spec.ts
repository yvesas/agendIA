import request from 'supertest';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { registerUser } from './helpers/factories';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    it('cria usuário e retorna tokens', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Ana Silva',
          email: 'ana@test.app',
          password: 'Str0ng@Pass!',
        })
        .expect(201);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'ana@test.app',
          name: 'Ana Silva',
        },
      });
    });

    it('rejeita senha fraca com 400 e mensagem por field', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Ana', email: 'ana@test.app', password: 'weakpass' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/^password:/)]),
      );
    });

    it('rejeita nome com menos de 3 caracteres', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Ab', email: 'ab@test.app', password: 'Str0ng@Pass!' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/^name:/)]),
      );
    });

    it('rejeita e-mail duplicado com 409', async () => {
      await registerUser(ctx, { email: 'dup@test.app' });

      await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Other',
          email: 'dup@test.app',
          password: 'Str0ng@Pass!',
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('autentica com credenciais corretas', async () => {
      const user = await registerUser(ctx, { password: 'Str0ng@Pass!' });

      const response = await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'Str0ng@Pass!' })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.user.id).toBe(user.id);
    });

    it('devolve 401 para senha errada', async () => {
      const user = await registerUser(ctx, { password: 'Str0ng@Pass!' });

      await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'WrongP@ss1' })
        .expect(401);
    });

    it('devolve 401 para e-mail inexistente', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@test.app', password: 'Str0ng@Pass!' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('emite novos tokens a partir de um refresh válido', async () => {
      const user = await registerUser(ctx);

      const response = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.user.id).toBe(user.id);
    });

    it('devolve 401 para refresh token inválido', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-jwt' })
        .expect(401);
    });

    it('devolve 401 se o usuário do token foi removido', async () => {
      const user = await registerUser(ctx);
      await truncateAll(ctx.db);

      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(401);
    });

    it('rejeita body sem refreshToken com 400', async () => {
      await request(ctx.app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });
  });
});
