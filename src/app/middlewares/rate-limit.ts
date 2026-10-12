import type { Request } from 'express'
import { ipKeyGenerator, rateLimit, type Options, type Store } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { createClient } from 'redis'

import { env } from '../../config/env.js'
import { ApiError } from '../../utils/api-error.js'
import { emailModel } from '../auth/models.js'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

// with REDIS_URL every instance shares one count; without it each process counts on its own, which is fine for local development
const redisClient = env.REDIS_URL ? createClient({url: env.REDIS_URL}) : null

if(redisClient) {
  // without an error listener a lost connection would crash the process; the client reconnects on its own
  redisClient.on('error', (error) => console.error('Redis error:', error instanceof Error ? error.message : error))
  redisClient.connect().catch((error) => console.error('Could not connect to Redis:', error instanceof Error ? error.message : error))
}

function createStore(name: string): Store | undefined {
  if(!redisClient) {
    return undefined
  }
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: `rl:${name}:`,
  })
}

type LimiterOptions = {
  name: string
  windowMs: number
  limit: number
  key?: (req: Request) => string
  // count only failed requests, so a user who gets their password right isn't slowed down by earlier typos
  failuresOnly?: boolean
  // false keeps the count in this process's memory, even when Redis is configured
  shared?: boolean
}

export function createRateLimiter({name, windowMs, limit, key, failuresOnly = false, shared = true}: LimiterOptions) {
  const store = shared ? createStore(name) : undefined
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: failuresOnly,
    // if Redis is down, let requests through rather than take sign in down with it; the error is still logged
    passOnStoreError: true,
    // the same 429 for every key, so a per-email limit doesn't reveal whether the email has an account
    handler: (_req, _res, next) => next(new ApiError(429, 'Too many requests, please try again later')),
    keyGenerator: key ?? ipKey,
  }
  if(store) {
    options.store = store
  }
  return rateLimit(options)
}

// ipKeyGenerator groups IPv6 addresses by /56 subnet, since one user usually controls a whole block of them
function ipKey(req: Request) {
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

// normalised exactly like the handlers do, so " JOHN@x.com" and "john@x.com" share a limit. a missing or invalid email
// falls back to the IP, and validation then rejects the request anyway
function emailKey(req: Request) {
  const parsed = emailModel.safeParse(req.body?.email)
  return parsed.success ? `email:${parsed.data}` : ipKey(req)
}

// runs after authenticateToken, so the user is known
function userKey(req: Request) {
  const userId = (req.user as any)?.id
  return userId ? `user:${userId}` : ipKey(req)
}

// tests run the real app and would trip these limits; the limiter itself is tested on its own
const isTest = env.NODE_ENV === 'test'
const limiter = (options: LimiterOptions) => isTest ? createRateLimiter({...options, limit: Number.MAX_SAFE_INTEGER, shared: false}) : createRateLimiter(options)

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
  uploadAvatarPerUser: limiter({name: 'upload-avatar-user', windowMs: HOUR, limit: 10, key: userKey}),
}
