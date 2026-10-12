import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from './api-error.js'

// the gateway adds this header to every request it forwards, and services add it when they call each other.
// a service that gets a request without it was reached directly, around the gateway's CORS and JSON-only checks
export const INTERNAL_KEY_HEADER = 'x-internal-key'

export function requireInternalKey(internalKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const presented = req.get(INTERNAL_KEY_HEADER)
    if(!presented || !safeEqual(presented, internalKey)) {
      return next(ApiError.forbidden('Requests must come through the gateway'))
    }
    next()
  }
}

// hashing first gives both sides the same length, which timingSafeEqual requires, without revealing the key's length
function safeEqual(a: string, b: string) {
  const hash = (value: string) => crypto.createHash('sha256').update(value).digest()
  return crypto.timingSafeEqual(hash(a), hash(b))
}
