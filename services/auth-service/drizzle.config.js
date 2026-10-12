import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// the same file the services read, see packages/shared/src/load-env.ts
dotenv.config({path: ['.env.microservices', '../../.env.microservices'], quiet: true});

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
