import { describe, expect, it } from 'vitest'
import {
  changePasswordPayloadModel,
  resetPasswordPayloadModel,
  signinPayloadModel,
  signupPayloadModel,
  verifyEmailPayloadModel,
} from '../../src/app/auth/models.js'

// Unit tests for the zod models in src/app/auth/models.ts.
// These call safeParse directly, with no HTTP or DB, so every edge case is cheap to check.
// The integration tests then only need one validation case per endpoint to prove the model is wired in.

const validSignup = { firstName: 'John', email: 'john@example.com', password: 'secret123' }

describe('signupPayloadModel', () => {
  it('accepts a minimal valid payload', () => {
    expect(signupPayloadModel.safeParse(validSignup).success).toBe(true)
  })

  it('trims and lowercases the email so the same address always maps to one account', () => {
    const result = signupPayloadModel.parse({ ...validSignup, email: '  John@Example.COM ' })
    expect(result.email).toBe('john@example.com')
  })

  it('trims names', () => {
    const result = signupPayloadModel.parse({ ...validSignup, firstName: '  John  ', lastName: ' Doe ' })
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Doe')
  })

  it('allows lastName to be null or missing', () => {
    expect(signupPayloadModel.safeParse({ ...validSignup, lastName: null }).success).toBe(true)
    expect(signupPayloadModel.safeParse(validSignup).success).toBe(true)
  })

  // each row is one invalid field; the rest of the payload stays valid
  it.each([
    ['firstName too short', { firstName: 'J' }],
    ['firstName only spaces', { firstName: '    ' }],
    ['firstName over 45 chars', { firstName: 'a'.repeat(46) }],
    ['lastName over 45 chars', { lastName: 'a'.repeat(46) }],
    ['invalid email', { email: 'not-an-email' }],
    ['email over 254 chars', { email: `${'a'.repeat(250)}@x.io` }],
    ['password under 6 chars', { password: '12345' }],
    // bcrypt ignores bytes after 72, so longer passwords are rejected instead of silently truncated
    ['password over 72 chars', { password: 'a'.repeat(73) }],
    ['negative age', { age: -1 }],
    ['non-integer age', { age: 20.5 }],
    ['age as a string', { age: '25' }],
  ])('rejects %s', (_label, override) => {
    expect(signupPayloadModel.safeParse({ ...validSignup, ...override }).success).toBe(false)
  })
})

describe('signinPayloadModel', () => {
  it('normalizes email the same way as signup', () => {
    expect(signinPayloadModel.parse({ email: ' JOHN@example.com', password: 'secret123' }).email)
      .toBe('john@example.com')
  })

  it('requires a password', () => {
    expect(signinPayloadModel.safeParse({ email: 'john@example.com' }).success).toBe(false)
  })
})

describe('verifyEmailPayloadModel', () => {
  it('accepts a 64-char hex token (what createTempToken generates)', () => {
    expect(verifyEmailPayloadModel.safeParse({ token: 'a'.repeat(64) }).success).toBe(true)
  })

  it('rejects empty and oversized tokens', () => {
    expect(verifyEmailPayloadModel.safeParse({ token: '' }).success).toBe(false)
    expect(verifyEmailPayloadModel.safeParse({ token: 'a'.repeat(101) }).success).toBe(false)
  })
})

describe('resetPasswordPayloadModel', () => {
  it('enforces the same password rules as signup', () => {
    expect(resetPasswordPayloadModel.safeParse({ token: 'abc', newPassword: '12345' }).success).toBe(false)
    expect(resetPasswordPayloadModel.safeParse({ token: 'abc', newPassword: 'a'.repeat(73) }).success).toBe(false)
    expect(resetPasswordPayloadModel.safeParse({ token: 'abc', newPassword: 'secret123' }).success).toBe(true)
  })
})

describe('changePasswordPayloadModel', () => {
  it('rejects a new password equal to the current one, reporting it on newPassword', () => {
    const result = changePasswordPayloadModel.safeParse({ currentPassword: 'secret123', newPassword: 'secret123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['newPassword'])
  })

  it('allows a short current password, so accounts from before the current rules can still change it', () => {
    expect(changePasswordPayloadModel.safeParse({ currentPassword: 'abc', newPassword: 'secret123' }).success).toBe(true)
  })
})
