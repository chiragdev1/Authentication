import express from 'express'
import type {Express, Request, Response} from 'express'

export function createExpressApplication(): Express {
  const app = express()

  // middlewares
  app.use(express.json({limit: '50kb'}))


  // routes
  app.get("/", (req: Request, res: Response)=> {
    return res.status(200).json({
      message: "Express Application is running"
    })
  })

  return app
}