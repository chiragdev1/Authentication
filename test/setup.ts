import { afterAll, beforeEach, vi } from 'vitest'

// Runs at the start of every test file, before the file's own imports are evaluated.

// Replace the real mail module (which calls Resend) with mocks for every test file.
// The controller passes the verification/reset URL to these functions, so tests read
// the raw token from the mock's call arguments (see lastTokenFrom in helpers.ts),
// just like a user would read it from their inbox.
vi.mock('../src/utils/mail.js', () => ({
  sendEmailVerificationMail: vi.fn().mockResolvedValue({}),
  sendWelcomeMail: vi.fn().mockResolvedValue({}),
  sendResetPasswordMail: vi.fn().mockResolvedValue({}),
}))

// Imported after vi.mock so the db pool is created with the test DATABASE_URL from vitest.config.ts
const { db } = await import('../src/db/index.js')
const { sql } = await import('drizzle-orm')

// Every test starts with an empty users table and fresh mock call history
beforeEach(async () => {
  await db.execute(sql`TRUNCATE users`)
  vi.clearAllMocks()
})

// Close the pg pool so the worker can exit cleanly
afterAll(async () => {
  await db.$client.end()
})
