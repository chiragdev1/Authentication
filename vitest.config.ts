import { defineConfig } from 'vitest/config'
import { testEnv } from './test/env.js'

// How a test run works (`pnpm test`):
//
//   1. globalSetup (test/global-setup.ts) runs once in the main process:
//      it recreates the `auth_test` database and applies the Drizzle migrations from ./drizzle.
//   2. Each test file then runs in a worker with `env` below already in process.env.
//   3. setupFiles (test/setup.ts) runs before each test file: it mocks the mail module
//      and empties the users table before every test.
//   4. Test files:
//        test/unit/*         - pure functions (zod models, JWT helpers, error handler), no DB or HTTP
//        test/integration/*  - real HTTP requests through Supertest to the Express app,
//                              backed by the real test database
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: './test/global-setup.ts',
    setupFiles: ['./test/setup.ts'],
    env: testEnv,
    // all integration files share one database and truncate it between tests,
    // so files must run one after another instead of in parallel
    fileParallelism: false,
    // bcrypt hashing makes auth requests slower than typical unit tests
    testTimeout: 15_000,
  },
})
