import express from 'express'
import cookieParser from 'cookie-parser'
import type {Express, NextFunction, Request, Response} from 'express'

import { ApiError } from '@authentication/shared/api-error'
import { errorHandler } from '@authentication/shared/error-handler'
import { requireInternalKey } from '@authentication/shared/internal-auth'
import { authRouter } from './auth/routes.js';
import { internalRouter } from './internal/routes.js';
import { env } from '../config/env.js';

// helmet, CORS and the JSON-only check run in the gateway; this service only takes requests that came through it
export function createExpressApplication(): Express {
  const app = express()
  app.disable('x-powered-by')

  // the gateway adds itself to X-Forwarded-For, so it is one more trusted proxy; per-IP rate limits depend on req.ip
  app.set('trust proxy', env.TRUST_PROXY + 1)

  // before the key check, so the gateway (or an orchestrator) can probe it
  app.get('/health', (req: Request, res: Response) => {
    return res.status(200).json({status: 'ok'})
  })

  app.use(requireInternalKey(env.INTERNAL_API_KEY))
  app.use(express.json({limit: '50kb'}))
  app.use(cookieParser())

  app.use('/auth', authRouter)
  // called by other services, never routed by the gateway
  app.use('/internal', internalRouter)

  // same JSON shape as every other error, instead of Express's HTML page
  app.use((req: Request, res: Response, next: NextFunction) => next(ApiError.notFound('Route not found')))

  app.use(errorHandler)
  return app
}
