import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AppointmentsModule } from './appointments/appointments.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { ExamsModule } from './exams/exams.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    ExamsModule,
    AppointmentsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
