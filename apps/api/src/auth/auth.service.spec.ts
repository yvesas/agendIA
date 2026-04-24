import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { EnvVars } from '../config/env.schema';
import { type User } from '../db/schema/users';
import { UsersRepository } from '../users/users.repository';

import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { hashToken } from './token-hash';

describe('AuthService', () => {
  let users: jest.Mocked<UsersRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let jwt: jest.Mocked<JwtService>;
  let config: jest.Mocked<ConfigService<EnvVars, true>>;
  let refreshTokens: jest.Mocked<RefreshTokensRepository>;
  let service: AuthService;

  const FIXED_USER: User = {
    id: 'user-1',
    name: 'Ana Silva',
    email: 'ana@example.com',
    passwordHash: 'stored-hash',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasher>;

    jwt = {
      sign: jest.fn((_payload, options) =>
        options?.secret === 'refresh-secret' ? 'refresh-token' : 'access-token',
      ),
      verifyAsync: jest.fn(),
      decode: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 })),
    } as unknown as jest.Mocked<JwtService>;

    config = {
      get: jest.fn((key: keyof EnvVars) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService<EnvVars, true>>;

    refreshTokens = {
      create: jest.fn(),
      findActiveByHash: jest.fn(),
      findActiveByUser: jest.fn(),
      findById: jest.fn(),
      touchLastUsed: jest.fn(),
      revokeById: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllForUser: jest.fn(),
      deleteStale: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokensRepository>;

    service = new AuthService(users, hasher, jwt, config, refreshTokens);
  });

  describe('register', () => {
    it('hashes the password, persists the user, persists refresh hash e retorna ambos tokens', async () => {
      users.findByEmail.mockResolvedValue(undefined);
      hasher.hash.mockResolvedValue('fresh-hash');
      users.create.mockResolvedValue(FIXED_USER);

      const result = await service.register({
        name: FIXED_USER.name,
        email: FIXED_USER.email,
        password: 'Str0ng@Pass',
      });

      expect(hasher.hash).toHaveBeenCalledWith('Str0ng@Pass');
      expect(refreshTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: FIXED_USER.id,
          tokenHash: hashToken('refresh-token'),
          expiresAt: expect.any(Date) as unknown,
        }),
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(FIXED_USER.email);
    });

    it('rejects duplicate email com ConflictException', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);

      await expect(
        service.register({
          name: FIXED_USER.name,
          email: FIXED_USER.email,
          password: 'Str0ng@Pass',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(refreshTokens.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('autentica e grava o hash do refresh', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);
      hasher.compare.mockResolvedValue(true);

      const result = await service.login({
        email: FIXED_USER.email,
        password: 'Str0ng@Pass',
      });

      expect(refreshTokens.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('401 para email inexistente', async () => {
      users.findByEmail.mockResolvedValue(undefined);
      await expect(
        service.login({ email: 'ghost@x.com', password: 'Str0ng@Pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });

    it('401 para senha errada', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);
      hasher.compare.mockResolvedValue(false);
      await expect(
        service.login({ email: FIXED_USER.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rotaciona: atualiza lastUsedAt, revoga o token atual e emite novos', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: FIXED_USER.id, email: FIXED_USER.email });
      refreshTokens.findActiveByHash.mockResolvedValue({
        id: 'token-row-1',
        userId: FIXED_USER.id,
        tokenHash: hashToken('valid-refresh'),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: null,
        createdAt: new Date(),
        ip: null,
        userAgent: null,
        lastUsedAt: null,
      });
      users.findById.mockResolvedValue(FIXED_USER);

      const result = await service.refresh('valid-refresh', {
        ip: '10.0.0.1',
        userAgent: 'jest',
      });

      expect(refreshTokens.findActiveByHash).toHaveBeenCalledWith(hashToken('valid-refresh'));
      expect(refreshTokens.touchLastUsed).toHaveBeenCalledWith('token-row-1');
      expect(refreshTokens.revokeById).toHaveBeenCalledWith('token-row-1');
      expect(refreshTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '10.0.0.1', userAgent: 'jest' }),
      );
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('revoga toda a família quando o token é reusado (replay defense)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: FIXED_USER.id, email: FIXED_USER.email });
      refreshTokens.findActiveByHash.mockResolvedValue(undefined);

      await expect(service.refresh('already-rotated')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(FIXED_USER.id);
      expect(refreshTokens.revokeById).not.toHaveBeenCalled();
      expect(refreshTokens.create).not.toHaveBeenCalled();
    });

    it('401 quando a assinatura do refresh é inválida', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('bogus')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.findActiveByHash).not.toHaveBeenCalled();
    });

    it('401 quando o usuário do token foi removido', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: FIXED_USER.id, email: FIXED_USER.email });
      refreshTokens.findActiveByHash.mockResolvedValue({
        id: 'token-row-1',
        userId: FIXED_USER.id,
        tokenHash: 'x',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        revokedAt: null,
        createdAt: new Date(),
        ip: null,
        userAgent: null,
        lastUsedAt: null,
      });
      users.findById.mockResolvedValue(undefined);

      await expect(service.refresh('valid')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revoga o token recebido por hash', async () => {
      await service.logout('some-refresh');
      expect(refreshTokens.revokeByHash).toHaveBeenCalledWith(hashToken('some-refresh'));
    });

    it('é no-op quando não há token', async () => {
      await service.logout(null);
      expect(refreshTokens.revokeByHash).not.toHaveBeenCalled();
    });
  });
});
