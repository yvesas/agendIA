import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type User } from '../db/schema/users';
import { UsersRepository } from '../users/users.repository';

import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';

describe('AuthService', () => {
  let users: jest.Mocked<UsersRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let jwt: jest.Mocked<JwtService>;
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
      sign: jest.fn().mockReturnValue('signed-token'),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(users, hasher, jwt);
  });

  describe('register', () => {
    it('hashes the password, persists the user and returns a signed token', async () => {
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
      expect(jwt.sign).toHaveBeenCalledWith({ sub: FIXED_USER.id, email: FIXED_USER.email });
      expect(result).toEqual({
        accessToken: 'signed-token',
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
    it('returns a token for correct credentials', async () => {
      users.findByEmail.mockResolvedValue(FIXED_USER);
      hasher.compare.mockResolvedValue(true);

      const result = await service.login({
        email: FIXED_USER.email,
        password: 'super-secret',
      });

      expect(hasher.compare).toHaveBeenCalledWith('super-secret', FIXED_USER.passwordHash);
      expect(result.accessToken).toBe('signed-token');
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
});
