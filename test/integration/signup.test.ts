import request from 'supertest'
import bcrypt from 'bcryptjs'
import { describe, expect, it, vi } from 'vitest'
import { app, findUserByEmail, mailMock, sha256, lastTokenFrom, validUser } from '../helpers.js'

// POST /auth/sign-up
//
// Flow: validate body -> hash password -> create email verification token ->
//       insert user (ON CONFLICT DO NOTHING on email) -> send verification mail (not awaited) -> 201 { id }

describe('POST /auth/sign-up', () => {
  it('creates an unverified user and returns its id', async () => {
    const res = await request(app).post('/auth/sign-up').send(validUser)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ success: true, data: { id: expect.any(String) } })

    const user = await findUserByEmail(validUser.email)
    expect(user).toMatchObject({ id: res.body.data.id, firstName: 'Test', emailVerified: false })
  })

  it('stores a bcrypt hash, never the plain password', async () => {
    await request(app).post('/auth/sign-up').send(validUser).expect(201)

    const user = await findUserByEmail(validUser.email)
    expect(user!.password).not.toBe(validUser.password)
    expect(await bcrypt.compare(validUser.password, user!.password!)).toBe(true)
  })

  it('emails a verification link and stores only the token hash, expiring in 15 minutes', async () => {
    await request(app).post('/auth/sign-up').send(validUser).expect(201)

    expect(mailMock.sendEmailVerificationMail).toHaveBeenCalledWith(
      validUser.email,
      expect.stringMatching(/^http:\/\/frontend\.test\/verify-email\?token=[a-f0-9]{64}$/),
    )

    // the db keeps sha256(token), so a leaked db can't be used to verify accounts
    const token = lastTokenFrom(mailMock.sendEmailVerificationMail)
    const user = await findUserByEmail(validUser.email)
    expect(user!.emailVerificationToken).toBe(sha256(token))

    const minutesLeft = (user!.emailVerificationTokenExpiry!.getTime() - Date.now()) / 60_000
    expect(minutesLeft).toBeGreaterThan(14)
    expect(minutesLeft).toBeLessThanOrEqual(15)
  })

  it('saves the email normalized (trimmed, lowercase)', async () => {
    await request(app).post('/auth/sign-up').send({ ...validUser, email: '  Test@Example.COM ' }).expect(201)
    expect(await findUserByEmail('test@example.com')).toBeDefined()
  })

  it('returns 409 for an email that already exists, even with different casing', async () => {
    await request(app).post('/auth/sign-up').send(validUser).expect(201)

    const res = await request(app).post('/auth/sign-up').send({ ...validUser, email: 'TEST@example.com' })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ success: false, message: 'User with this email already exists' })
  })

  it('creates only one user when two sign-ups for the same email race', async () => {
    // both requests pass validation at the same time; the unique index + ON CONFLICT DO NOTHING
    // must make exactly one of them win
    const [a, b] = await Promise.all([
      request(app).post('/auth/sign-up').send(validUser),
      request(app).post('/auth/sign-up').send(validUser),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
  })

  it('returns 400 with the failing field names for invalid input', async () => {
    const res = await request(app).post('/auth/sign-up').send({ ...validUser, email: 'nope', password: '1' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('email')
    expect(res.body.message).toContain('password')
  })

  it('still creates the user when the verification mail fails', async () => {
    // the mail is sent without await; a failure is only logged, and the user can get a new link by signing in
    mailMock.sendEmailVerificationMail.mockRejectedValueOnce(new Error('Resend down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await request(app).post('/auth/sign-up').send(validUser).expect(201)
    expect(await findUserByEmail(validUser.email)).toBeDefined()

    consoleSpy.mockRestore()
  })
})
