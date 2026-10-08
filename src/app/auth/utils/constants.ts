import type { CookieOptions } from 'express'

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
}

// email links point at frontend pages, which post the token to the api
export function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000'
}
