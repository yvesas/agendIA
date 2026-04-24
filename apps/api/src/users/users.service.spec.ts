import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { AppointmentsRepository } from '../appointments/appointments.repository';
import { PasswordHasher } from '../auth/password-hasher';
import { type User } from '../db/schema/users';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let users: jest.Mocked<UsersRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let appointments: jest.Mocked<AppointmentsRepository>;
  let service: UsersService;

  const STORED_USER: User = {
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
      update: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasher>;

    appointments = {
      findManyByUser: jest.fn(),
      findById: jest.fn(),
      findOverlapping: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<AppointmentsRepository>;

    service = new UsersService(users, hasher, appointments);
  });

  describe('getById', () => {
    it('returns a sanitized user without the password hash', async () => {
      users.findById.mockResolvedValue(STORED_USER);

      const result = await service.getById(STORED_USER.id);

      expect(result).toEqual({
        id: STORED_USER.id,
        name: STORED_USER.name,
        email: STORED_USER.email,
        createdAt: STORED_USER.createdAt,
        updatedAt: STORED_USER.updatedAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      users.findById.mockResolvedValue(undefined);

      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates only the fields provided and returns the sanitized user', async () => {
      const updated: User = { ...STORED_USER, name: 'Ana Renamed' };
      users.findById.mockResolvedValue(STORED_USER);
      users.update.mockResolvedValue(updated);

      const result = await service.updateProfile(STORED_USER.id, { name: 'Ana Renamed' });

      expect(users.update).toHaveBeenCalledWith(STORED_USER.id, {
        name: 'Ana Renamed',
        email: STORED_USER.email,
      });
      expect(result.name).toBe('Ana Renamed');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('allows updating both name and email together', async () => {
      const updated: User = { ...STORED_USER, name: 'A', email: 'new@example.com' };
      users.findById.mockResolvedValue(STORED_USER);
      users.findByEmail.mockResolvedValue(undefined);
      users.update.mockResolvedValue(updated);

      await service.updateProfile(STORED_USER.id, {
        name: 'A',
        email: 'new@example.com',
      });

      expect(users.update).toHaveBeenCalledWith(STORED_USER.id, {
        name: 'A',
        email: 'new@example.com',
      });
    });

    it('rejects a new email already taken by another user with ConflictException', async () => {
      users.findById.mockResolvedValue(STORED_USER);
      users.findByEmail.mockResolvedValue({ ...STORED_USER, id: 'another-user' });

      await expect(
        service.updateProfile(STORED_USER.id, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(users.update).not.toHaveBeenCalled();
    });

    it('allows setting the same email (no-op email change)', async () => {
      users.findById.mockResolvedValue(STORED_USER);
      users.update.mockResolvedValue(STORED_USER);

      await service.updateProfile(STORED_USER.id, { email: STORED_USER.email });

      expect(users.findByEmail).not.toHaveBeenCalled();
      expect(users.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      users.findById.mockResolvedValue(undefined);

      await expect(service.updateProfile('missing', { name: 'Anybody' })).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(users.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('verifies the current password before hashing and updating', async () => {
      users.findById.mockResolvedValue(STORED_USER);
      hasher.compare.mockResolvedValue(true);
      hasher.hash.mockResolvedValue('new-hash');
      users.update.mockResolvedValue(STORED_USER);

      await service.changePassword(STORED_USER.id, {
        currentPassword: 'right',
        newPassword: 'NewPass@123',
      });

      expect(hasher.compare).toHaveBeenCalledWith('right', STORED_USER.passwordHash);
      expect(hasher.hash).toHaveBeenCalledWith('NewPass@123');
      expect(users.update).toHaveBeenCalledWith(STORED_USER.id, { passwordHash: 'new-hash' });
    });

    it('throws UnauthorizedException when the current password does not match', async () => {
      users.findById.mockResolvedValue(STORED_USER);
      hasher.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(STORED_USER.id, {
          currentPassword: 'wrong',
          newPassword: 'NewPass@123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(hasher.hash).not.toHaveBeenCalled();
      expect(users.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      users.findById.mockResolvedValue(undefined);

      await expect(
        service.changePassword('missing', {
          currentPassword: 'x',
          newPassword: 'NewPass@123',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(hasher.compare).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('resolves when the user is deleted', async () => {
      users.deleteById.mockResolvedValue(true);

      await expect(service.deleteAccount(STORED_USER.id)).resolves.toBeUndefined();

      expect(users.deleteById).toHaveBeenCalledWith(STORED_USER.id);
    });

    it('throws NotFoundException when the user did not exist', async () => {
      users.deleteById.mockResolvedValue(false);

      await expect(service.deleteAccount('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('exportData', () => {
    it('inclui user sanitizado + agendamentos e timestamp ISO', async () => {
      users.findById.mockResolvedValue(STORED_USER);
      appointments.findManyByUser.mockResolvedValue([]);

      const result = await service.exportData(STORED_USER.id);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.id).toBe(STORED_USER.id);
      expect(result.appointments).toEqual([]);
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(appointments.findManyByUser).toHaveBeenCalledWith(STORED_USER.id);
    });

    it('lança NotFoundException se o usuário não existe', async () => {
      users.findById.mockResolvedValue(undefined);

      await expect(service.exportData('missing')).rejects.toBeInstanceOf(NotFoundException);

      expect(appointments.findManyByUser).not.toHaveBeenCalled();
    });
  });
});
