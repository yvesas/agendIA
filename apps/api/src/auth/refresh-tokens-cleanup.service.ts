import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import type { EnvVars } from '../config/env.schema';

import { RefreshTokensRepository } from './refresh-tokens.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokensCleanupService {
  private readonly logger = new Logger(RefreshTokensCleanupService.name);

  constructor(
    private readonly repository: RefreshTokensRepository,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'refresh-tokens-cleanup' })
  async cleanup(): Promise<number> {
    const retentionDays = this.config.get('REFRESH_TOKENS_RETENTION_DAYS', { infer: true });
    const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);
    const removed = await this.repository.deleteStale(cutoff);
    if (removed > 0) {
      this.logger.log(`Removed ${removed} refresh token(s) older than ${retentionDays} day(s).`);
    }
    return removed;
  }
}
