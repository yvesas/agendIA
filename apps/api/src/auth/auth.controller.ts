import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import {
  type LoginInput,
  type RegisterInput,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '@agendia/contracts';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from './auth-cookies';
import { AuthService } from './auth.service';

const LOGIN_ATTEMPTS_PER_MINUTE = 5;
const REGISTER_ATTEMPTS_PER_HOUR = 10;
const REFRESH_ATTEMPTS_PER_MINUTE = 30;

interface PublicAuthResponse {
  user: { id: string; email: string; name: string };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: seconds(3600), limit: REGISTER_ATTEMPTS_PER_HOUR } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const result = await this.auth.register(body);
    setAuthCookies(response, result);
    return { user: result.user };
  }

  @Throttle({ default: { ttl: seconds(60), limit: LOGIN_ATTEMPTS_PER_MINUTE } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicAuthResponse> {
    const result = await this.auth.login(body);
    setAuthCookies(response, result);
    return { user: result.user };
  }

  @Throttle({ default: { ttl: seconds(60), limit: REFRESH_ATTEMPTS_PER_MINUTE } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() rawBody: unknown,
  ): Promise<PublicAuthResponse> {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const cookieToken = cookies?.[REFRESH_TOKEN_COOKIE];
    const bodyToken = parseBodyRefresh(rawBody);
    const token = cookieToken ?? bodyToken;
    const result = await this.auth.refresh(token ?? '');
    setAuthCookies(response, result);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    clearAuthCookies(response);
  }
}

function parseBodyRefresh(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const parsed = refreshSchema.safeParse(raw);
  return parsed.success ? parsed.data.refreshToken : undefined;
}
