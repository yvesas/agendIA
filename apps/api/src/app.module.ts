import { Module, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { ExamsModule } from './exams/exams.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

const DEFAULT_THROTTLE_LIMIT = 60;

const throttlerProvider: Provider | null =
  process.env.NODE_ENV === 'test' ? null : { provide: APP_GUARD, useClass: ThrottlerGuard };

const providers: Provider[] = [
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ...(throttlerProvider ? [throttlerProvider] : []),
];

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: seconds(60), limit: DEFAULT_THROTTLE_LIMIT }],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ExamsModule,
    AppointmentsModule,
    HealthModule,
  ],
  providers,
})
export class AppModule {}
