import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import type {Express, Request, Response} from 'express'

import { authRouter } from './auth/routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requireJsonBody } from './middlewares/require-json.js';
import { env } from '../config/env.js';

export function createExpressApplication(): Express {
  const app = express()

  // req.ip comes from X-Forwarded-For only for this many trusted proxies; per-IP rate limits depend on it
  app.set('trust proxy', env.TRUST_PROXY)

  // middlewares
  app.use(helmet())
  // only the frontend may call the api with cookies; with JSON-only bodies this is what stops other sites from making requests
  app.use(cors({origin: env.FRONTEND_URL, credentials: true}))
  app.use(requireJsonBody)
  app.use(express.json({limit: '50kb'}))
  app.use(express.static('public'))
  app.use(cookieParser())

  app.use('/auth', authRouter)

  // routes
  app.get("/", (req: Request, res: Response)=> {
    return res.status(200).json({
      message: "Express Application is running"
    })
  })

  app.use(errorHandler)
  return app
}
