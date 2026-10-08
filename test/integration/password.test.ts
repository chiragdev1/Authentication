import request from 'supertest'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/index.js'
import { usersTable } from '../../src/db/schema.js'
import {
  app, findUserByEmail, getCookie, lastTokenFrom, mailMock, sha256, signInAgent, signUpVerified, validUser,
} from '../helpers.js'

// Password flows.
//
// Forgot + reset (user is signed out):
//   POST /auth/forgot-password { email } -> same generic 200 whether or not the email exists;
//     if it exists, store sha256(token) with a 15 min expiry and email a reset link.
//   POST /auth/reset-password/:token { newPassword } -> look up sha256(token); if valid, set the new
//     password, clear the reset token (single use) and the refresh token (signs out every session).
//
// Change (user is signed in):
//   POST /auth/change-password { currentPassword, newPassword } -> requires the access token cookie;
//     checks currentPassword, saves the new one and rotates the refresh token, so other sessions are
//     signed out while this one gets new cookies and stays signed in.

const NEW_PASSWORD = 'new-secret-456'
const GENERIC_MESSAGE = 'If an account with this email exists, a reset password email has been sent'

// Runs the forgot-password step and returns the raw token from the reset email
async function requestResetToken() {
  await request(app).post('/auth/forgot-password').send({ email: validUser.email }).expect(200)
  return lastTokenFrom(mailMock.sendResetPasswordMail)
}

describe('POST /auth/forgot-password', () => {
  it('emails a reset link and stores only the token hash', async () => {
    await signUpVerified()

    const res = await request(app).post('/auth/forgot-password').send({ email: validUser.email })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe(GENERIC_MESSAGE)
    expect(mailMock.sendResetPasswordMail).toHaveBeenCalledWith(
      validUser.email,
      validUser.firstName,
      expect.stringMatching(/^http:\/\/frontend\.test\/reset-password\?token=[a-f0-9]{64}$/),
    )
    const token = lastTokenFrom(mailMock.sendResetPasswordMail)
    expect((await findUserByEmail(validUser.email))!.resetPasswordToken).toBe(sha256(token))
  })

  it('gives an unknown email the exact same response, and sends no mail', async () => {
    // so this endpoint can't be used to find out which emails are registered
    await signUpVerified()

    const known = await request(app).post('/auth/forgot-password').send({ email: validUser.email })
    mailMock.sendResetPasswordMail.mockClear()
    const unknown = await request(app).post('/auth/forgot-password').send({ email: 'nobody@example.com' })

    expect(unknown.status).toBe(known.status)
    expect(unknown.body).toEqual(known.body)
    expect(mailMock.sendResetPasswordMail).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid email', async () => {
    await request(app).post('/auth/forgot-password').send({ email: 'nope' }).expect(400)
  })
})

describe('POST /auth/reset-password/:token', () => {
  it('sets the new password: the new one works, the old one does not', async () => {
    await signUpVerified()
    const token = await requestResetToken()

    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: NEW_PASSWORD }).expect(200)

    await request(app).post('/auth/sign-in').send({ email: validUser.email, password: NEW_PASSWORD }).expect(200)
    await request(app).post('/auth/sign-in').send({ email: validUser.email, password: validUser.password }).expect(401)
  })

  it('signs out existing sessions by revoking the refresh token', async () => {
    // if the password was reset because the account was compromised, the attacker's session must end
    await signUpVerified()
    const { res: signin } = await signInAgent()
    const token = await requestResetToken()

    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: NEW_PASSWORD }).expect(200)

    expect((await findUserByEmail(validUser.email))!.refreshToken).toBeNull()
    await request(app).post('/auth/refresh')
      .set('Cookie', `refresh_token=${getCookie(signin, 'refresh_token')}`)
      .expect(401)
  })

  it('does not accept the same token twice', async () => {
    await signUpVerified()
    const token = await requestResetToken()

    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: NEW_PASSWORD }).expect(200)
    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: 'another-pass' }).expect(404)
  })

  it('rejects an expired token', async () => {
    await signUpVerified()
    const token = await requestResetToken()
    await db.update(usersTable)
      .set({ resetPasswordTokenExpiry: new Date(Date.now() - 1000) })
      .where(eq(usersTable.email, validUser.email))

    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: NEW_PASSWORD }).expect(404)
  })

  it('rejects an unknown token', async () => {
    await request(app).post(`/auth/reset-password/${'0'.repeat(64)}`).send({ newPassword: NEW_PASSWORD }).expect(404)
  })

  it('returns 400 for a too-short new password and keeps the token usable', async () => {
    await signUpVerified()
    const token = await requestResetToken()

    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: '123' }).expect(400)
    await request(app).post(`/auth/reset-password/${token}`).send({ newPassword: NEW_PASSWORD }).expect(200)
  })
})

describe('POST /auth/change-password', () => {
  const changeBody = { currentPassword: validUser.password, newPassword: NEW_PASSWORD }

  it('changes the password and keeps the current session signed in', async () => {
    await signUpVerified()
    const { agent } = await signInAgent()

    const res = await agent.post('/auth/change-password').send(changeBody)

    expect(res.status).toBe(200)
    // the response sets new cookies, which the agent picks up
    expect(getCookie(res, 'access_token')).toBeDefined()
    expect(getCookie(res, 'refresh_token')).toBeDefined()
    await agent.get('/auth/me').expect(200)
    await agent.post('/auth/refresh').expect(200)

    await request(app).post('/auth/sign-in').send({ email: validUser.email, password: NEW_PASSWORD }).expect(200)
  })

  it('signs out other sessions by rotating the refresh token', async () => {
    await signUpVerified()
    const { agent, res: signin } = await signInAgent()
    const oldRefresh = getCookie(signin, 'refresh_token')!

    await agent.post('/auth/change-password').send(changeBody).expect(200)

    await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${oldRefresh}`).expect(401)
  })

  it('returns 400 when the current password is wrong, and keeps the old password', async () => {
    await signUpVerified()
    const { agent } = await signInAgent()

    await agent.post('/auth/change-password').send({ ...changeBody, currentPassword: 'wrong-pass' }).expect(400)

    await request(app).post('/auth/sign-in').send({ email: validUser.email, password: validUser.password }).expect(200)
  })

  it('returns 400 when the new password equals the current one', async () => {
    await signUpVerified()
    const { agent } = await signInAgent()

    await agent.post('/auth/change-password')
      .send({ currentPassword: validUser.password, newPassword: validUser.password })
      .expect(400)
  })

  it('returns 401 when not signed in', async () => {
    await request(app).post('/auth/change-password').send(changeBody).expect(401)
  })
})
