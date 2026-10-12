import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // the test files share one database, so they run one at a time
    fileParallelism: false,
    // bcrypt at cost 12 is deliberately slow
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
