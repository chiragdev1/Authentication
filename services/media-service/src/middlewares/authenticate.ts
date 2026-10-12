import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '@authentication/shared/api-error'
import '@authentication/shared/request'
import { authCookieNames } from '@authentication/shared/cookies'
import { authenticate } from '../utils/auth-client.js'
import { env } from '../config/env.js'

const COOKIE_NAMES = authCookieNames(env.COOKIE_PREFIX)

// auth-service checks the token and that its session is still live, so a revoked session can't upload here either
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[COOKIE_NAMES.access]

  if(!token) {
    throw ApiError.unauthorized('Token not provided')
  }

  const {user, sessionId} = await authenticate(token)

  req.user = user
  req.sessionId = sessionId
  next()
}
