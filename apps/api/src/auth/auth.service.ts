import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput, RegisterInput } from '@agendia/contracts';

import type { EnvVars } from '../config/env.schema';
import { type User } from '../db/schema/users';
import { UsersRepository } from '../users/users.repository';

import type { JwtPayload } from './jwt.strategy';
import { PasswordHasher } from './password-hasher';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { hashToken } from './token-hash';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface SessionMetadata {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  async register(dto: RegisterInput, metadata: SessionMetadata = {}): Promise<AuthResponse> {
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

    return this.buildAuthResponse(user, metadata);
  }

  async login(dto: LoginInput, metadata: SessionMetadata = {}): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.hasher.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user, metadata);
  }

  async refresh(refreshToken: string, metadata: SessionMetadata = {}): Promise<AuthResponse> {
    const payload = await this.verifyRefreshJwt(refreshToken);

    const hash = hashToken(refreshToken);
    const existing = await this.refreshTokens.findActiveByHash(hash);
    if (!existing) {
      // Cenário clássico de reuso: token válido por assinatura mas já foi revogado
      // (rotação anterior). Revoga preventivamente toda a família do usuário.
      await this.refreshTokens.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    await this.refreshTokens.touchLastUsed(existing.id);
    await this.refreshTokens.revokeById(existing.id);
    return this.buildAuthResponse(user, metadata);
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.refreshTokens.revokeByHash(hashToken(refreshToken));
  }

  private async verifyRefreshJwt(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async buildAuthResponse(user: User, metadata: SessionMetadata): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);
    // jti aleatório garante que rotações no mesmo segundo gerem tokens distintos
    // (iat tem granularidade de segundo em JWT).
    const refreshToken = this.jwt.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
      },
    );

    const decoded: unknown = this.jwt.decode(refreshToken);
    const decodedExp =
      decoded && typeof decoded === 'object' && 'exp' in decoded
        ? (decoded as { exp?: unknown }).exp
        : undefined;
    const expiresAt =
      typeof decodedExp === 'number'
        ? new Date(decodedExp * 1000)
        : new Date(Date.now() + DEFAULT_REFRESH_TTL_MS);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ip: metadata.ip ?? null,
      userAgent: metadata.userAgent ?? null,
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

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
