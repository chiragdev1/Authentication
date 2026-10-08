import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenExpiry,
  verifyRefreshToken,
} from '../../src/app/auth/utils/jwt-token.js'
import { ApiError } from '../../src/utils/api-error.js'

// Unit tests for src/app/auth/utils/jwt-token.ts.
// The secrets and expiry times come from testEnv (test/env.ts), injected by vitest.config.ts.

const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY!
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET_KEY!

// verifyRefreshToken should throw a 401 ApiError, so the error handler returns 401 instead of 500
function expectUnauthorized(fn: () => unknown) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).statusCode).toBe(401)
    return
  }
  throw new Error('expected function to throw')
}

describe('generateAccessToken / generateRefreshToken', () => {
  it('signs each token type with its own secret', () => {
    const access = generateAccessToken({ userId: 'u1' })
    const refresh = generateRefreshToken({ userId: 'u1' })

    expect(() => jwt.verify(access, ACCESS_SECRET)).not.toThrow()
    expect(() => jwt.verify(refresh, REFRESH_SECRET)).not.toThrow()
    expect(() => jwt.verify(access, REFRESH_SECRET)).toThrow()
  })

  it('makes every token unique (jwtid), even for the same user in the same second', () => {
    // matters because the db looks up sessions by the refresh token's hash
    expect(generateRefreshToken({ userId: 'u1' })).not.toBe(generateRefreshToken({ userId: 'u1' }))
  })

  it('uses the configured expiry times', () => {
    const access = jwt.decode(generateAccessToken({ userId: 'u1' })) as jwt.JwtPayload
    const refresh = jwt.decode(generateRefreshToken({ userId: 'u1' })) as jwt.JwtPayload

    expect(access.exp! - access.iat!).toBe(15 * 60) // ACCESS_TOKEN_EXPIRY = 15m
    expect(refresh.exp! - refresh.iat!).toBe(7 * 24 * 60 * 60) // REFRESH_TOKEN_EXPIRY = 7d
  })
})

describe('getTokenExpiry', () => {
  it('returns the token exp claim as a Date (used for cookie expiry)', () => {
    const token = generateAccessToken({ userId: 'u1' })
    const { exp } = jwt.decode(token) as jwt.JwtPayload

    expect(getTokenExpiry(token).getTime()).toBe(exp! * 1000)
  })
})

describe('verifyRefreshToken', () => {
  it('returns the payload of a valid refresh token', () => {
    const token = generateRefreshToken({ userId: 'u1' })
    expect(verifyRefreshToken(token).userId).toBe('u1')
  })

  it('rejects an access token used as a refresh token', () => {
    expectUnauthorized(() => verifyRefreshToken(generateAccessToken({ userId: 'u1' })))
  })

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'u1' }, REFRESH_SECRET, { expiresIn: '-1s' })
    expectUnauthorized(() => verifyRefreshToken(expired))
  })

  it('rejects a tampered token', () => {
    const token = generateRefreshToken({ userId: 'u1' })
    expectUnauthorized(() => verifyRefreshToken(token.slice(0, -2) + 'xx'))
  })

  it('rejects a token without userId', () => {
    const noUser = jwt.sign({ foo: 'bar' }, REFRESH_SECRET)
    expectUnauthorized(() => verifyRefreshToken(noUser))
  })

  it('rejects garbage', () => {
    expectUnauthorized(() => verifyRefreshToken('not-a-jwt'))
  })
})
