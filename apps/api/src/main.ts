import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { EnvVars } from './config/env.schema';

const SWAGGER_PATH = 'docs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  // Security headers. CSP desligado por padrão porque o Swagger UI carrega
  // scripts/style inline — quando o consumidor for só API sem docs, dá pra
  // religar com contentSecurityPolicy: { directives: { ... } }.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  setupSwagger(app);

  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const port = config.get('API_PORT', { infer: true });

  await app.listen(port);
}

function setupSwagger(app: Parameters<typeof SwaggerModule.setup>[1]): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Agendia API')
    .setDescription('API for the Agendia exam-scheduling portal.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Exams', 'Exam catalogue')
    .addTag('Appointments', 'User bookings')
    .addTag('Health', 'Service liveness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}

void bootstrap();
