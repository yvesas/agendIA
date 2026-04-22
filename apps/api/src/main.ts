import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import type { EnvVars } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const port = config.get('API_PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
