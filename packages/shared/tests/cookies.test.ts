import { describe, expect, it } from 'vitest'
import { authCookieNames } from '../src/cookies.js'

describe('auth cookie names', () => {
  it('keeps the documented names without a prefix, and prefixes both otherwise', () => {
    expect(authCookieNames('')).toEqual({access: 'access_token', refresh: 'refresh_token'})
    expect(authCookieNames('ms_')).toEqual({access: 'ms_access_token', refresh: 'ms_refresh_token'})
  })
})
