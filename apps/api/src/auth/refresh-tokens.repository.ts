import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/database.module';
import { type RefreshToken, refreshTokens } from '../db/schema/refresh-tokens';

interface CreateInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateInput): Promise<RefreshToken> {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      })
      .returning();
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

  async findActiveByUser(userId: string): Promise<RefreshToken[]> {
    return this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, sql`now()`),
        ),
      )
      .orderBy(desc(refreshTokens.createdAt));
  }

  async findById(id: string): Promise<RefreshToken | undefined> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);
    return row;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(refreshTokens.id, id));
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

  /**
   * Remove rows já expiradas ou revogadas há mais que o cutoff.
   * Sessões ativas (não-revogadas e ainda dentro da validade) são preservadas.
   */
  async deleteStale(cutoff: Date): Promise<number> {
    const rows = await this.db
      .delete(refreshTokens)
      .where(
        sql`${refreshTokens.expiresAt} < ${cutoff.toISOString()} OR ${refreshTokens.revokedAt} < ${cutoff.toISOString()}`,
      )
      .returning({ id: refreshTokens.id });
    return rows.length;
  }
}
