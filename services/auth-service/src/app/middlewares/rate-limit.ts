import type { Request } from 'express'
import { createRateLimiterFactory, HOUR, ipKey, MINUTE, userKey } from '@authentication/shared/rate-limit'

import { env } from '../../config/env.js'
import { emailModel } from '../auth/models.js'

// normalised exactly like the handlers do, so " JOHN@x.com" and "john@x.com" share a limit. a missing or invalid email
// falls back to the IP, and validation then rejects the request anyway
function emailKey(req: Request) {
  const parsed = emailModel.safeParse(req.body?.email)
  return parsed.success ? `email:${parsed.data}` : ipKey(req)
}

const limiter = createRateLimiterFactory({redisUrl: env.REDIS_URL, prefix: 'auth', disabled: env.NODE_ENV === 'test'})

export const rateLimits = {
  signinPerIp: limiter({name: 'signin-ip', windowMs: 15 * MINUTE, limit: 100}),
  signinPerEmail: limiter({name: 'signin-email', windowMs: 15 * MINUTE, limit: 5, key: emailKey, failuresOnly: true}),
  signupPerIp: limiter({name: 'signup-ip', windowMs: HOUR, limit: 10}),
  forgotPasswordPerIp: limiter({name: 'forgot-ip', windowMs: HOUR, limit: 10}),
  forgotPasswordPerEmail: limiter({name: 'forgot-email', windowMs: HOUR, limit: 3, key: emailKey}),
  verifyEmailPerIp: limiter({name: 'verify-ip', windowMs: 15 * MINUTE, limit: 20}),
  resetPasswordPerIp: limiter({name: 'reset-ip', windowMs: 15 * MINUTE, limit: 20}),
  refreshPerIp: limiter({name: 'refresh-ip', windowMs: MINUTE, limit: 60}),
  changePasswordPerUser: limiter({name: 'change-password-user', windowMs: 15 * MINUTE, limit: 5, key: userKey}),
}
