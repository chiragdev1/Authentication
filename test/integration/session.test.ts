import request from 'supertest'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/index.js'
import { usersTable } from '../../src/db/schema.js'
import { generateAccessToken, generateRefreshToken } from '../../src/app/auth/utils/jwt-token.js'
import { app, findUserByEmail, getCookie, signInAgent, signUpVerified, validUser } from '../helpers.js'

// What happens after sign-in: GET /auth/me, POST /auth/refresh, POST /auth/logout.
//
// The session lives in two cookies:
//   access_token  - short-lived JWT, checked by the authenticateToken middleware on protected routes
//   refresh_token - long-lived JWT, also stored in the db as sha256(token); one per user.
//                   /refresh swaps it for a new pair (rotation), /logout deletes it from the db.

describe('GET /auth/me (authenticateToken middleware)', () => {
  it('returns the signed-in user without any secret fields', async () => {
    await signUpVerified()
    const { agent } = await signInAgent()

    const res = await agent.get('/auth/me')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      id: expect.any(String),
      firstName: validUser.firstName,
      lastName: validUser.lastName,
      age: validUser.age,
      email: validUser.email,
      emailVerified: true,
    })
    // the middleware selects only safe columns; password and token hashes must never be returned
    for (const key of ['password', 'refreshToken', 'emailVerificationToken', 'resetPasswordToken']) {
      expect(res.body.data).not.toHaveProperty(key)
    }
  })

  it('returns 401 without an access token', async () => {
    await request(app).get('/auth/me').expect(401)
  })

  it('returns 401 for a tampered, expired or wrong-secret token', async () => {
    await signUpVerified()
    const { id } = (await findUserByEmail(validUser.email))!
    const secret = process.env.ACCESS_TOKEN_SECRET_KEY!

    const tampered = generateAccessToken({ userId: id }).slice(0, -2) + 'xx'
    const expired = jwt.sign({ userId: id }, secret, { expiresIn: '-1s' })
    const refreshAsAccess = generateRefreshToken({ userId: id }) // signed with the refresh secret

    for (const token of [tampered, expired, refreshAsAccess]) {
      await request(app).get('/auth/me').set('Cookie', `access_token=${token}`).expect(401)
    }
  })

  it('returns 401 when the user was deleted after the token was issued', async () => {
    await signUpVerified()
    const { agent } = await signInAgent()
    await db.delete(usersTable).where(eq(usersTable.email, validUser.email))

    await agent.get('/auth/me').expect(401)
  })
})

describe('POST /auth/refresh', () => {
  it('issues a new token pair and replaces the stored refresh token', async () => {
    await signUpVerified()
    const { agent, res: signin } = await signInAgent()

    const res = await agent.post('/auth/refresh')

    expect(res.status).toBe(200)
    const newRefresh = getCookie(res, 'refresh_token')!
    expect(newRefresh).toBeDefined()
    expect(newRefresh).not.toBe(getCookie(signin, 'refresh_token'))
    // the agent now holds the new cookies, so it's still signed in
    await agent.get('/auth/me').expect(200)
  })

  it('rejects the old refresh token once it has been rotated', async () => {
    // if a refresh token is stolen and used, the real user's next refresh fails (and vice versa),
    // so a stolen token stops working as soon as either side refreshes
    await signUpVerified()
    const { agent, res: signin } = await signInAgent()
    const oldRefresh = getCookie(signin, 'refresh_token')!

    await agent.post('/auth/refresh').expect(200)

    await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${oldRefresh}`).expect(401)
  })

  it('returns 401 without a refresh token', async () => {
    await request(app).post('/auth/refresh').expect(401)
  })

  it('returns 401 for a validly signed token that is not in the db', async () => {
    // e.g. a token from an earlier session: the signature is fine, but it was revoked
    await signUpVerified()
    const { id } = (await findUserByEmail(validUser.email))!
    const notStored = generateRefreshToken({ userId: id })

    await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${notStored}`).expect(401)
  })

  it('returns 401 for an access token sent as the refresh token', async () => {
    await signUpVerified()
    const { res: signin } = await signInAgent()
    const accessToken = getCookie(signin, 'access_token')!

    await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${accessToken}`).expect(401)
  })
})

describe('POST /auth/logout', () => {
  it('clears both cookies and revokes the refresh token in the db', async () => {
    await signUpVerified()
    const { agent, res: signin } = await signInAgent()
    const refreshToken = getCookie(signin, 'refresh_token')!

    const res = await agent.post('/auth/logout')

    expect(res.status).toBe(200)
    // clearing a cookie = setting it empty with an expiry in the past
    expect(getCookie(res, 'access_token')).toBe('')
    expect(getCookie(res, 'refresh_token')).toBe('')
    expect((await findUserByEmail(validUser.email))!.refreshToken).toBeNull()
    // even if the refresh token was copied before logout, it no longer works
    await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${refreshToken}`).expect(401)
  })

  it('works without any cookies', async () => {
    await request(app).post('/auth/logout').expect(200)
  })

  it('works with an expired access token (the route has no auth middleware)', async () => {
    await signUpVerified()
    const { res: signin } = await signInAgent()
    const { id } = (await findUserByEmail(validUser.email))!
    const expired = jwt.sign({ userId: id }, process.env.ACCESS_TOKEN_SECRET_KEY!, { expiresIn: '-1s' })

    await request(app).post('/auth/logout')
      .set('Cookie', [`access_token=${expired}`, `refresh_token=${getCookie(signin, 'refresh_token')}`])
      .expect(200)

    expect((await findUserByEmail(validUser.email))!.refreshToken).toBeNull()
  })

  it('does not revoke the session for a refresh token that belongs to nobody', async () => {
    // logout matches on the token hash, so one user can't sign out another
    await signUpVerified()
    await signInAgent()
    const stored = (await findUserByEmail(validUser.email))!.refreshToken

    await request(app).post('/auth/logout').set('Cookie', 'refresh_token=someone-elses-token').expect(200)

    expect((await findUserByEmail(validUser.email))!.refreshToken).toBe(stored)
  })
})
