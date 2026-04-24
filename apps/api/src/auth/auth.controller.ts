import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import {
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '@agendia/contracts';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { type AuthResponse, AuthService } from './auth.service';

const LOGIN_ATTEMPTS_PER_MINUTE = 5;
const REGISTER_ATTEMPTS_PER_HOUR = 10;
const REFRESH_ATTEMPTS_PER_MINUTE = 30;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: seconds(3600), limit: REGISTER_ATTEMPTS_PER_HOUR } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Throttle({ default: { ttl: seconds(60), limit: LOGIN_ATTEMPTS_PER_MINUTE } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Throttle({ default: { ttl: seconds(60), limit: REFRESH_ATTEMPTS_PER_MINUTE } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken);
  }
}
