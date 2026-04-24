import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ChangePasswordInput, UpdateProfileInput } from '@agendia/contracts';

import {
  type AppointmentWithExam,
  AppointmentsRepository,
} from '../appointments/appointments.repository';
import { PasswordHasher } from '../auth/password-hasher';
import { type User } from '../db/schema/users';

import { UsersRepository } from './users.repository';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataExport {
  generatedAt: string;
  user: PublicUser;
  appointments: AppointmentWithExam[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly appointments: AppointmentsRepository,
  ) {}

  async getById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublic(user);
  }

  async updateProfile(id: string, dto: UpdateProfileInput): Promise<PublicUser> {
    const current = await this.users.findById(id);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const nextEmail = dto.email ?? current.email;
    if (dto.email && dto.email !== current.email) {
      const taken = await this.users.findByEmail(dto.email);
      if (taken && taken.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const updated = await this.users.update(id, {
      name: dto.name ?? current.name,
      email: nextEmail,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return this.toPublic(updated);
  }

  async changePassword(id: string, dto: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await this.hasher.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.hasher.hash(dto.newPassword);
    await this.users.update(id, { passwordHash });
  }

  async deleteAccount(id: string): Promise<void> {
    const deleted = await this.users.deleteById(id);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }

  async exportData(id: string): Promise<DataExport> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const appointments = await this.appointments.findManyByUser(id);
    return {
      generatedAt: new Date().toISOString(),
      user: this.toPublic(user),
      appointments,
    };
  }

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
