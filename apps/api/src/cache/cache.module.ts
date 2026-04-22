import { createKeyv } from '@keyv/redis';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvVars } from '../config/env.schema';

const MS_PER_SECOND = 1000;

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        stores: [createKeyv(config.get('REDIS_URL', { infer: true }))],
        ttl: config.get('EXAMS_CACHE_TTL_SECONDS', { infer: true }) * MS_PER_SECOND,
      }),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
