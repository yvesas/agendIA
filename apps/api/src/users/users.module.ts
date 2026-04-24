import { Module } from '@nestjs/common';

import { PasswordHasher } from '../auth/password-hasher';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, PasswordHasher],
  exports: [UsersRepository],
})
export class UsersModule {}
