import { Module } from '@nestjs/common';

import { AppointmentsModule } from '../appointments/appointments.module';
import { PasswordHasher } from '../auth/password-hasher';
import { RefreshTokensModule } from '../auth/refresh-tokens.module';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [AppointmentsModule, RefreshTokensModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, PasswordHasher],
  exports: [UsersRepository],
})
export class UsersModule {}
