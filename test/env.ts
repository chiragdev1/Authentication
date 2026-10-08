// Shared test settings, imported by vitest.config.ts (to inject env vars into the test workers)
// and by global-setup.ts (which runs in the main process, before those env vars exist).
//
// Tests use their own database, `auth_test`, on the same Postgres container as development
// (`pnpm db:up`), so running the suite never touches your dev data.

export const PG_ADMIN_URL = 'postgres://postgres:postgres@localhost:5432/postgres'
export const TEST_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/auth_test'

// Every variable the app reads at runtime. These are set before any app module is imported,
// and dotenv never overrides a variable that is already set, so values from .env can't leak in.
export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DATABASE_URL,
  ACCESS_TOKEN_SECRET_KEY: 'test-access-secret',
  REFRESH_TOKEN_SECRET_KEY: 'test-refresh-secret',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  FRONTEND_URL: 'http://frontend.test',
  RESEND_API_KEY: 're_test_dummy', // never used: the mail module is mocked in setup.ts
}
