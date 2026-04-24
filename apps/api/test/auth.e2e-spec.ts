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

function extractRefreshCookie(headers: Record<string, unknown>): string {
  const setCookie = headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const match = cookies.map((c) => String(c)).find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE}=`));
  if (!match) throw new Error('refresh cookie not set');
  // split sempre devolve ao menos um elemento; o ?? é só para o noUncheckedIndexedAccess
  return match.split(';')[0] ?? match;
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

    it('revoga o refresh no DB — uso posterior do token antigo falha', async () => {
      // registerUser faz o register e o agent guarda os cookies
      const registerResponse = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Logout Reuse',
          email: `logout-${Date.now()}@test.app`,
          password: 'Str0ng@Pass!',
        })
        .expect(201);

      const originalRefreshCookie = extractRefreshCookie(registerResponse.headers);

      await request(ctx.app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', originalRefreshCookie)
        .expect(204);

      // Mesmo cookie — mas já foi revogado no DB
      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', originalRefreshCookie)
        .expect(401);
    });
  });

  describe('rotação de refresh token', () => {
    it('rotação em cadeia: cada novo token funciona uma vez', async () => {
      const registerResponse = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Rotation Test',
          email: `rotate-${Date.now()}@test.app`,
          password: 'Str0ng@Pass!',
        })
        .expect(201);

      const cookieFromRegister = extractRefreshCookie(registerResponse.headers);

      // Primeira rotação
      const r1 = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieFromRegister)
        .expect(200);
      const cookie2 = extractRefreshCookie(r1.headers);
      expect(cookie2).not.toBe(cookieFromRegister);

      // Segunda rotação com o novo cookie — ainda válido
      const r2 = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookie2)
        .expect(200);
      const cookie3 = extractRefreshCookie(r2.headers);
      expect(cookie3).not.toBe(cookie2);
    });

    it('reuso de token já rotacionado → 401 e invalida a família (defesa de replay)', async () => {
      const registerResponse = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Replay Defense',
          email: `replay-${Date.now()}@test.app`,
          password: 'Str0ng@Pass!',
        })
        .expect(201);

      const oldRefreshCookie = extractRefreshCookie(registerResponse.headers);

      // Rotação legítima
      const firstRefresh = await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(200);

      const newRefreshCookie = extractRefreshCookie(firstRefresh.headers);

      // "Atacante" tenta reusar R1 já revogado
      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(401);

      // Defesa: R2 também é invalidado ao detectar o reuso.
      // Usuário legítimo precisará autenticar de novo — comportamento proposital.
      await request(ctx.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', newRefreshCookie)
        .expect(401);
    });
  });
});
