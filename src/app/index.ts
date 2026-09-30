import express from 'express'
import cookieParser from 'cookie-parser'
import type {Express, Request, Response} from 'express'

import { authRouter } from './auth/routes.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createExpressApplication(): Express {
  const app = express()

  // middlewares
  app.use(express.json({limit: '50kb'}))
  app.use(express.urlencoded({extended: true}))
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