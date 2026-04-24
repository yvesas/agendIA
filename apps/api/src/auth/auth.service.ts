import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput, RegisterInput } from '@agendia/contracts';

import type { EnvVars } from '../config/env.schema';
import { type User } from '../db/schema/users';
import { UsersRepository } from '../users/users.repository';

import type { JwtPayload } from './jwt.strategy';
import { PasswordHasher } from './password-hasher';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async register(dto: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.hasher.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.buildAuthResponse(user);
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
