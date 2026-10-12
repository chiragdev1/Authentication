import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type {Express, NextFunction, Request, Response} from 'express'

import { ApiError } from '@authentication/shared/api-error'
import { errorHandler } from '@authentication/shared/error-handler'
import { requireJsonBody } from './require-json.js'
import { proxyTo } from './proxy.js'
import { env } from './config/env.js'

type Targets = {auth: string, media: string}

// the edge of the system: browser-facing checks happen once here, then each path goes to the service that owns it.
// bodies are streamed through, not parsed, so size limits and validation stay with the service that reads them
export function createGatewayApplication(targets: Targets = {auth: env.AUTH_SERVICE_URL, media: env.MEDIA_SERVICE_URL}): Express {
  const app = express()

  app.use(helmet())
  // only the frontend may call the api with cookies; with JSON-only bodies this is what stops other sites from making requests
  app.use(cors({origin: env.FRONTEND_URL, credentials: true}))
  app.use(rejectDotSegments)
  app.use(requireJsonBody)

  app.get('/', (req: Request, res: Response) => {
    return res.status(200).json({message: 'Gateway is running'})
  })

  // the more specific path first: the avatar upload is the one /auth route that auth-service doesn't own
  app.use(proxyTo(targets.media, '/auth/upload-avatar'))
  app.use(proxyTo(targets.auth, '/auth'))

  // /internal and anything else no service owns
  app.use((req: Request, res: Response, next: NextFunction) => next(ApiError.notFound('Route not found')))
  app.use(errorHandler)
  return app
}

// the url is forwarded as sent, so a path like /auth/../internal/authenticate must never reach a service, which might resolve it
function rejectDotSegments(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase()
  if(/(^|\/)(\.|%2e){1,2}(\/|$)/.test(path) || path.includes('%2f') || path.includes('%5c') || path.includes('\\')) {
    return next(ApiError.badRequest('Invalid path'))
  }
  next()
}
