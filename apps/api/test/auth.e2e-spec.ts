import request from 'supertest';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../src/auth/auth-cookies';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { registerUser } from './helpers/factories';

function expectAuthCookies(headers: Record<string, unknown>): void {
  const setCookie = headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const joined = cookies.join('\n');
  expect(joined).toContain(`${ACCESS_TOKEN_COOKIE}=`);
  expect(joined).toContain(`${REFRESH_TOKEN_COOKIE}=`);
  expect(joined).toMatch(/HttpOnly/i);
  expect(joined).toMatch(/SameSite=Lax/i);
}

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
    it('cria usuário, retorna { user } no body e emite Set-Cookie httpOnly', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Ana Silva',
          email: 'ana@test.app',
          password: 'Str0ng@Pass!',
        })
        .expect(201);

      expect(response.body).toEqual({
        user: { id: expect.any(String), email: 'ana@test.app', name: 'Ana Silva' },
      });
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expectAuthCookies(response.headers);
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
    it('autentica, seta cookies httpOnly e devolve só { user }', async () => {
      const user = await registerUser(ctx, { password: 'Str0ng@Pass!' });

      const response = await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'Str0ng@Pass!' })
        .expect(200);

      expect(response.body).toEqual({
        user: { id: user.id, email: user.email, name: user.name },
      });
      expectAuthCookies(response.headers);
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
    it('emite novos cookies a partir do refresh cookie do agent', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent.post('/auth/refresh').expect(200);

      expect(response.body).toEqual({
        user: { id: user.id, email: user.email, name: user.name },
      });
      expectAuthCookies(response.headers);
    });

    it('devolve 401 para refresh cookie inválido', async () => {
      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE}=not-a-real-jwt`)
        .expect(401);
    });

    it('devolve 401 se o usuário do token foi removido', async () => {
      const user = await registerUser(ctx);
      await truncateAll(ctx.db);

      await user.agent.post('/auth/refresh').expect(401);
    });

    it('devolve 401 sem cookie nem body', async () => {
      await request(ctx.app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('expira os cookies (Max-Age=0)', async () => {
      const user = await registerUser(ctx);

      const response = await user.agent.post('/auth/logout').expect(204);

      const setCookie = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const joined = cookies.join('\n');
      expect(joined).toContain(ACCESS_TOKEN_COOKIE);
      expect(joined).toContain(REFRESH_TOKEN_COOKIE);
      expect(joined).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    });
  });
});
