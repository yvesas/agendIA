import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import type { EnvVars } from '../config/env.schema';

import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_CLIENT = Symbol('PG_CLIENT');

export type Database = PostgresJsDatabase<typeof schema>;

const MAX_POOL_CONNECTIONS = 10;

@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>): Sql =>
        postgres(config.get('DATABASE_URL', { infer: true }), {
          max: MAX_POOL_CONNECTIONS,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_CLIENT],
      useFactory: (client: Sql): Database => drizzle(client, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CLIENT) private readonly client: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end();
  }
}
