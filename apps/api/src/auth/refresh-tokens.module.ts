import { Module } from '@nestjs/common';

import { RefreshTokensRepository } from './refresh-tokens.repository';

@Module({
  providers: [RefreshTokensRepository],
  exports: [RefreshTokensRepository],
})
export class RefreshTokensModule {}
