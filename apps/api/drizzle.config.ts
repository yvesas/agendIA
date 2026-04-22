import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run drizzle-kit. Copy .env.example to .env and fill it in.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './src/db/migrations',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
