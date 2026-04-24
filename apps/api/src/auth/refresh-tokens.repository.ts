import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import { type RefreshToken, refreshTokens } from '../db/schema/refresh-tokens';

interface CreateInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateInput): Promise<RefreshToken> {
    const [row] = await this.db.insert(refreshTokens).values(input).returning();
    if (!row) {
      throw new Error('Refresh token insert returned no rows');
    }
    return row;
  }

  async findActiveByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    return row;
  }

  async revokeById(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)));
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}
