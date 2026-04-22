import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';

import type { EnvVars } from '../config/env.schema';

@Injectable()
export class PasswordHasher {
  private readonly saltRounds: number;

  constructor(config: ConfigService<EnvVars, true>) {
    this.saltRounds = config.get('BCRYPT_SALT_ROUNDS', { infer: true });
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
