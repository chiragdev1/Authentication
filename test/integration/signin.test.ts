import request from 'supertest'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/index.js'
import { usersTable } from '../../src/db/schema.js'
import {
  app, findUserByEmail, getCookie, getSetCookieLine, mailMock, sha256, signUp, signUpVerified, validUser,
} from '../helpers.js'

// POST /auth/sign-in
//
// Flow: validate body -> find user by email -> bcrypt.compare password -> create access + refresh JWTs ->
//       store sha256(refresh token) in the db -> if the email is unverified AND the last verification link
//       has expired, store a new one and email it -> set both tokens as httpOnly cookies -> 200 { id }

const credentials = { email: validUser.email, password: validUser.password }

describe('POST /auth/sign-in', () => {
  it('signs in and sets access_token and refresh_token as httpOnly cookies', async () => {
    const { body: signup } = await signUpVerified()

    const res = await request(app).post('/auth/sign-in').send(credentials)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: signup.data.id })
    // httpOnly keeps the tokens away from JavaScript running in the page (XSS)
    expect(getSetCookieLine(res, 'access_token')).toMatch(/HttpOnly/i)
    expect(getSetCookieLine(res, 'refresh_token')).toMatch(/HttpOnly/i)
    expect(getSetCookieLine(res, 'refresh_token')).toMatch(/SameSite=Lax/i)
  })

  it('stores only the sha256 hash of the refresh token in the db', async () => {
    await signUpVerified()
    const res = await request(app).post('/auth/sign-in').send(credentials)

    const user = await findUserByEmail(validUser.email)
    expect(user!.refreshToken).toBe(sha256(getCookie(res, 'refresh_token')!))
  })

  it('accepts the email in any casing', async () => {
    await signUpVerified()
    await request(app).post('/auth/sign-in').send({ ...credentials, email: ' TEST@Example.com ' }).expect(200)
  })

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    // identical responses mean sign-in can't be used to find out which emails are registered
    await signUpVerified()

    const wrongPassword = await request(app).post('/auth/sign-in').send({ ...credentials, password: 'wrong-pass' })
    const unknownEmail = await request(app).post('/auth/sign-in').send({ ...credentials, email: 'nobody@example.com' })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(getCookie(wrongPassword, 'access_token')).toBeUndefined()
  })

  it('returns 400 for invalid input', async () => {
    await request(app).post('/auth/sign-in').send({ email: 'not-an-email' }).expect(400)
  })

  describe('resending the verification mail', () => {
    it('does not resend while the link from sign-up is still valid', async () => {
      await signUp()
      mailMock.sendEmailVerificationMail.mockClear()

      await request(app).post('/auth/sign-in').send(credentials).expect(200)
      expect(mailMock.sendEmailVerificationMail).not.toHaveBeenCalled()
    })

    it('sends a new link once the previous one has expired', async () => {
      await signUp()
      const oldHash = (await findUserByEmail(validUser.email))!.emailVerificationToken
      await db.update(usersTable)
        .set({ emailVerificationTokenExpiry: new Date(Date.now() - 1000) })
        .where(eq(usersTable.email, validUser.email))
      mailMock.sendEmailVerificationMail.mockClear()

      await request(app).post('/auth/sign-in').send(credentials).expect(200)

      expect(mailMock.sendEmailVerificationMail).toHaveBeenCalledTimes(1)
      const user = await findUserByEmail(validUser.email)
      expect(user!.emailVerificationToken).not.toBe(oldHash)
      expect(user!.emailVerificationTokenExpiry!.getTime()).toBeGreaterThan(Date.now())
    })

    it('never sends one to a verified user', async () => {
      await signUpVerified()
      mailMock.sendEmailVerificationMail.mockClear()

      await request(app).post('/auth/sign-in').send(credentials).expect(200)
      expect(mailMock.sendEmailVerificationMail).not.toHaveBeenCalled()
    })
  })
})
