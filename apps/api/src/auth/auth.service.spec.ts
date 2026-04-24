import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { EnvVars } from '../config/env.schema';
import { type User } from '../db/schema/users';
import { UsersRepository } from '../users/users.repository';

import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';

describe('AuthService', () => {
  let users: jest.Mocked<UsersRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let jwt: jest.Mocked<JwtService>;
  let config: jest.Mocked<ConfigService<EnvVars, true>>;
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
    } as unknown as jest.Mocked<JwtService>;

    config = {
      get: jest.fn((key: keyof EnvVars) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService<EnvVars, true>>;

    service = new AuthService(users, hasher, jwt, config);
  });

  describe('register', () => {
    it('hashes the password, persists the user and returns both tokens', async () => {
      users.findByEmail.mockResolvedValue(undefined);
      hasher.hash.mockResolvedValue('fresh-hash');
      users.create.mockResolvedValue(FIXED_USER);

      const result = await service.register({
        name: FIXED_USER.name,
        email: FIXED_USER.email,
        password: 'super-secret',
      });

      expect(hasher.hash).toHaveBeenCalledWith('super-secret');
      expect(users.create).toHaveBeenCalledWith({
        name: FIXED_USER.name,
        email: FIXED_USER.email,
        passwordHash: 'fresh-hash',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: FIXED_USER.id, email: FIXED_USER.email, name: FIXED_USER.name },
      });
    });

    it('rejects an email already in use with a ConflictException', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);

      await expect(
        service.register({
          name: FIXED_USER.name,
          email: FIXED_USER.email,
          password: 'whatever',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });

    it('never leaks the stored password hash to the caller', async () => {
      users.findByEmail.mockResolvedValue(undefined);
      hasher.hash.mockResolvedValue('fresh-hash');
      users.create.mockResolvedValue(FIXED_USER);

      const result = await service.register({
        name: FIXED_USER.name,
        email: FIXED_USER.email,
        password: 'super-secret',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens for correct credentials', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);
      hasher.compare.mockResolvedValue(true);

      const result = await service.login({
        email: FIXED_USER.email,
        password: 'super-secret',
      });

      expect(hasher.compare).toHaveBeenCalledWith('super-secret', FIXED_USER.passwordHash);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(FIXED_USER.email);
    });

    it('throws UnauthorizedException when the email is unknown', async () => {
      users.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'missing@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(hasher.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);
      hasher.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: FIXED_USER.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses the same error message whether the email is missing or the password is wrong', async () => {
      users.findByEmail.mockResolvedValueOnce(undefined);
      const missingEmailError = await service
        .login({ email: 'missing@example.com', password: 'x' })
        .catch((error: unknown) => error);

      users.findByEmail.mockResolvedValueOnce(FIXED_USER);
      hasher.compare.mockResolvedValueOnce(false);
      const wrongPasswordError = await service
        .login({ email: FIXED_USER.email, password: 'wrong' })
        .catch((error: unknown) => error);

      expect(missingEmailError).toBeInstanceOf(UnauthorizedException);
      expect(wrongPasswordError).toBeInstanceOf(UnauthorizedException);
      expect((missingEmailError as UnauthorizedException).message).toBe(
        (wrongPasswordError as UnauthorizedException).message,
      );
    });
  });

  describe('refresh', () => {
    it('issues new tokens for a valid refresh token', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({
        sub: FIXED_USER.id,
        email: FIXED_USER.email,
      });
      users.findById.mockResolvedValue(FIXED_USER);

      const result = await service.refresh('valid-refresh-token');

      expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'refresh-secret',
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe(FIXED_USER.id);
    });

    it('throws UnauthorizedException when the refresh token is invalid', async () => {
      (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('bogus')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.findById).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      (jwt.verifyAsync as jest.Mock).mockResolvedValue({
        sub: FIXED_USER.id,
        email: FIXED_USER.email,
      });
      users.findById.mockResolvedValue(undefined);

      await expect(service.refresh('valid')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
