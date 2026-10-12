import type { CookieOptions } from 'express'
import { env } from '../../../config/env.js'

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax'
}

// the refresh token is only needed by /auth/refresh and /auth/logout, so it isn't sent with every other request
export const refreshCookieOptions: CookieOptions = {
  ...cookieOptions,
  path: '/auth'
}

// email links point at frontend pages, which post the token to the api
export function getFrontendUrl() {
  return env.FRONTEND_URL
}

export const TEMP_TOKEN_TTL_MS = 15 * 60 * 1000
export const ACCOUNT_EXISTS_MAIL_COOLDOWN_MS = 15 * 60 * 1000
export const RESET_PASSWORD_MAIL_COOLDOWN_MS = 2 * 60 * 1000

// a second refresh with the token that was just replaced, within this window, is two tabs racing rather than a stolen token
export const REFRESH_REUSE_GRACE_MS = 10 * 1000
