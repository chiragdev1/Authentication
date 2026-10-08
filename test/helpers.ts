import crypto from 'crypto'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import type { Mock } from 'vitest'
import type { Response } from 'supertest'

import { createExpressApplication } from '../src/app/index.js'
import { db } from '../src/db/index.js'
import { usersTable } from '../src/db/schema.js'
import * as mail from '../src/utils/mail.js'

// The real Express app. Supertest calls it directly, so no server is started and no port is used.
export const app = createExpressApplication()

// The mocked mail functions from setup.ts, typed as mocks so tests can inspect their calls
export const mailMock = {
  sendEmailVerificationMail: mail.sendEmailVerificationMail as unknown as Mock,
  sendWelcomeMail: mail.sendWelcomeMail as unknown as Mock,
  sendResetPasswordMail: mail.sendResetPasswordMail as unknown as Mock,
}

export const validUser = {
  firstName: 'Test',
  lastName: 'User',
  age: 25,
  email: 'test@example.com',
  password: 'secret123',
}

// The controller stores sha256(token) in the db, so tests use the same hash to check stored values
export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex')

// Mail functions take the URL as their last argument, e.g. http://frontend.test/verify-email?token=abc.
// This returns the raw `token` from the most recent call, the same token the user would get by email.
export function lastTokenFrom(mailFn: Mock): string {
  const url = mailFn.mock.calls.at(-1)?.at(-1) as string | undefined
  if (!url) throw new Error('mail function was not called')
  return new URL(url).searchParams.get('token')!
}

// Returns the value of a cookie set by the response, e.g. getCookie(res, 'refresh_token')
export function getCookie(res: Response, name: string): string | undefined {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = header?.find((c) => c.startsWith(`${name}=`))
  return cookie?.split(';')[0]!.slice(name.length + 1)
}

// Returns the full Set-Cookie line (with flags like HttpOnly) for a cookie
export function getSetCookieLine(res: Response, name: string): string | undefined {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined
  return header?.find((c) => c.startsWith(`${name}=`))
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email))
  return user
}

// --- flow helpers: each one drives the app through its public API, like a real client ---

export async function signUp(overrides: Partial<typeof validUser> = {}) {
  const res = await request(app).post('/auth/sign-up').send({ ...validUser, ...overrides })
  if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res
}

// Signs up, then "clicks" the link in the verification email
export async function signUpVerified(overrides: Partial<typeof validUser> = {}) {
  const res = await signUp(overrides)
  const token = lastTokenFrom(mailMock.sendEmailVerificationMail)
  await request(app).post(`/auth/verify-email/${token}`).expect(200)
  return res
}

// Signs in with a Supertest agent. The agent stores cookies from responses and sends them on
// later requests, like a browser, so `agent.get('/auth/me')` is authenticated afterwards.
export async function signInAgent(email = validUser.email, password = validUser.password) {
  const agent = request.agent(app)
  const res = await agent.post('/auth/sign-in').send({ email, password })
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, res }
}
