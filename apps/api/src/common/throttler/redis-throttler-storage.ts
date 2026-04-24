import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

import type { EnvVars } from '../../config/env.schema';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const WINDOW_KEY_PREFIX = 'throttler:count:';
const BLOCK_KEY_PREFIX = 'throttler:block:';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(config: ConfigService<EnvVars, true>) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), {
      // Conecta sob demanda: evita segurar o event loop no boot do app
      // (importante em testes onde o throttler está desligado globalmente).
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.redis.on('error', (error) => {
      this.logger.error(`Redis throttler error: ${error.message}`);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const windowKey = `${WINDOW_KEY_PREFIX}${throttlerName}:${key}`;
    const blockKey = `${BLOCK_KEY_PREFIX}${throttlerName}:${key}`;

    const existingBlockTtl = await this.redis.pttl(blockKey);
    if (existingBlockTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: existingBlockTtl,
      };
    }

    const pipeline = this.redis.multi();
    pipeline.incr(windowKey);
    pipeline.pttl(windowKey);
    const raw = await pipeline.exec();
    const totalHits = Number(raw?.[0]?.[1] ?? 0);
    let timeToExpire = Number(raw?.[1]?.[1] ?? 0);

    if (totalHits === 1 || timeToExpire < 0) {
      await this.redis.pexpire(windowKey, ttl);
      timeToExpire = ttl;
    }

    if (totalHits > limit && blockDuration > 0) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status === 'end' || this.redis.status === 'close') {
      return;
    }
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
