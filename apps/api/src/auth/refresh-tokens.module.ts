import { Module } from '@nestjs/common';

import { RefreshTokensCleanupService } from './refresh-tokens-cleanup.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';

@Module({
  providers: [RefreshTokensRepository, RefreshTokensCleanupService],
  exports: [RefreshTokensRepository],
})
export class RefreshTokensModule {}
