import { describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'

import { createRateLimiter } from '../src/app/middlewares/rate-limit.js'
import { errorHandler } from '../src/app/middlewares/error-handler.js'

// the app turns limits off under test, so the limiter is checked on its own small app
function appWith(limiter: express.RequestHandler, status = 200) {
  const app = express()
  app.use(express.json())
  app.post('/', limiter, (_req, res) => { res.status(status).json({}) })
  app.use(errorHandler)
  return app
}

describe('rate limiter', () => {
  it('answers 429 once the limit is reached', async () => {
    const app = appWith(createRateLimiter({name: 'test', windowMs: 60_000, limit: 2, shared: false}))

    const statuses = []
    for(let i = 0; i < 3; i++) {
      statuses.push((await request(app).post('/')).status)
    }
    expect(statuses).toEqual([200, 200, 429])
  })

  it('counts only failures when asked to, so a correct password is never slowed down', async () => {
    const ok = appWith(createRateLimiter({name: 'test-ok', windowMs: 60_000, limit: 1, failuresOnly: true, shared: false}))
    for(let i = 0; i < 3; i++) {
      expect((await request(ok).post('/')).status).toBe(200)
    }

    const failing = appWith(createRateLimiter({name: 'test-fail', windowMs: 60_000, limit: 1, failuresOnly: true, shared: false}), 401)
    expect((await request(failing).post('/')).status).toBe(401)
    expect((await request(failing).post('/')).status).toBe(429)
  })
})
