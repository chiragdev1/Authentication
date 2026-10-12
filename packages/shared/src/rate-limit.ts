import type { Request, RequestHandler } from 'express'
import { ipKeyGenerator, rateLimit, type Options, type Store } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { createClient } from 'redis'

import { ApiError } from './api-error.js'
import './request.js'

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE

export type LimiterOptions = {
  name: string
  windowMs: number
  limit: number
  key?: (req: Request) => string
  // count only failed requests, so a user who gets their password right isn't slowed down by earlier typos
  failuresOnly?: boolean
  // false keeps the count in this process's memory, even when Redis is configured
  shared?: boolean
}

export function createRateLimiter({name, windowMs, limit, key, failuresOnly = false}: LimiterOptions, store?: Store): RequestHandler {
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

// each service builds its limits through one of these, so they all share one Redis connection and key prefix.
// with a redisUrl every instance shares one count; without it each process counts on its own, which is fine for local development
export function createRateLimiterFactory({redisUrl, prefix, disabled = false}: {redisUrl?: string | undefined, prefix: string, disabled?: boolean}): (options: LimiterOptions) => RequestHandler {
  // tests run the real app and would trip these limits; the limiter itself is tested on its own
  if(disabled) {
    return (options: LimiterOptions) => createRateLimiter({...options, limit: Number.MAX_SAFE_INTEGER})
  }

  const redisClient = redisUrl ? createClient({url: redisUrl}) : null

  if(redisClient) {
    // without an error listener a lost connection would crash the process; the client reconnects on its own
    redisClient.on('error', (error) => console.error('Redis error:', error instanceof Error ? error.message : error))
    redisClient.connect().catch((error) => console.error('Could not connect to Redis:', error instanceof Error ? error.message : error))
  }

  return (options: LimiterOptions) => {
    const shared = options.shared ?? true
    const store = shared && redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      // the service name keeps two services from counting into the same key
      prefix: `rl:${prefix}:${options.name}:`,
    }) : undefined
    return createRateLimiter(options, store)
  }
}

// ipKeyGenerator groups IPv6 addresses by /56 subnet, since one user usually controls a whole block of them
export function ipKey(req: Request) {
  return `ip:${ipKeyGenerator(req.ip ?? '')}`
}

// runs after the service's authentication middleware, so the user is known
export function userKey(req: Request) {
  const userId = (req.user as any)?.id
  return userId ? `user:${userId}` : ipKey(req)
}
