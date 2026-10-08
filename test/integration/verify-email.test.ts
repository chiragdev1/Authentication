import request from 'supertest'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/index.js'
import { usersTable } from '../../src/db/schema.js'
import { app, findUserByEmail, lastTokenFrom, mailMock, signUp, validUser } from '../helpers.js'

// POST /auth/verify-email/:token
//
// Flow: sign-up emails a link with a raw token -> the frontend posts that token here ->
//       sha256(token) is looked up in the db -> if found and not expired, the user is marked
//       verified, the token is cleared (single use) and a welcome mail is sent.

describe('POST /auth/verify-email/:token', () => {
  it('verifies the user with the token from the email', async () => {
    await signUp()
    const token = lastTokenFrom(mailMock.sendEmailVerificationMail)

    const res = await request(app).post(`/auth/verify-email/${token}`)

    expect(res.status).toBe(200)
    const user = await findUserByEmail(validUser.email)
    expect(user).toMatchObject({ emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null })
  })

  it('sends a welcome mail after verifying', async () => {
    await signUp()
    await request(app).post(`/auth/verify-email/${lastTokenFrom(mailMock.sendEmailVerificationMail)}`).expect(200)

    expect(mailMock.sendWelcomeMail).toHaveBeenCalledWith(validUser.email, validUser.firstName)
  })

  it('does not accept the same token twice', async () => {
    await signUp()
    const token = lastTokenFrom(mailMock.sendEmailVerificationMail)

    await request(app).post(`/auth/verify-email/${token}`).expect(200)
    await request(app).post(`/auth/verify-email/${token}`).expect(404)
  })

  it('rejects an expired token', async () => {
    await signUp()
    const token = lastTokenFrom(mailMock.sendEmailVerificationMail)

    // move the expiry into the past instead of waiting 15 minutes
    await db.update(usersTable)
      .set({ emailVerificationTokenExpiry: new Date(Date.now() - 1000) })
      .where(eq(usersTable.email, validUser.email))

    const res = await request(app).post(`/auth/verify-email/${token}`)
    expect(res.status).toBe(404)
    expect((await findUserByEmail(validUser.email))!.emailVerified).toBe(false)
  })

  it('rejects an unknown token', async () => {
    await signUp()
    await request(app).post(`/auth/verify-email/${'0'.repeat(64)}`).expect(404)
  })

  it('rejects the stored hash used as the token', async () => {
    // someone who can read the db only sees sha256(token); posting that must not work
    await signUp()
    const { emailVerificationToken } = (await findUserByEmail(validUser.email))!
    await request(app).post(`/auth/verify-email/${emailVerificationToken}`).expect(404)
  })

  it('returns 400 for a token longer than 100 chars', async () => {
    await request(app).post(`/auth/verify-email/${'a'.repeat(101)}`).expect(400)
  })
})
