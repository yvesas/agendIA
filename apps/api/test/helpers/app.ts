import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';

import { AppModule } from '../../src/app.module';
import { DRIZZLE, type Database } from '../../src/db/database.module';
import { applyTestEnv } from '../env';

export interface TestAppContext {
  app: INestApplication;
  db: Database;
}

export async function createTestApp(): Promise<TestAppContext> {
  applyTestEnv();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  const db = app.get<Database>(DRIZZLE);

  return { app, db };
}
