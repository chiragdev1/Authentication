import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import { createGatewayApplication } from '../src/app.js'

// stand-ins for the services: each answers with what it received, so the tests see exactly what the gateway forwarded
function echoService(name: string) {
  const app = express()
  app.use(express.json())
  app.use((req, res) => {
    res.cookie('from', name)
    res.json({service: name, method: req.method, url: req.url, headers: req.headers, body: req.body})
  })
  return http.createServer(app)
}

const auth = echoService('auth')
const media = echoService('media')
let gateway: express.Express

function urlOf(server: http.Server) {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

beforeAll(async () => {
  await new Promise<void>(resolve => auth.listen(0, '127.0.0.1', resolve))
  await new Promise<void>(resolve => media.listen(0, '127.0.0.1', resolve))
  gateway = createGatewayApplication({auth: urlOf(auth), media: urlOf(media)})
})

afterAll(() => {
  auth.close()
  media.close()
})

describe('routing', () => {
  it('sends /auth to auth-service with the path, body and cookies unchanged', async () => {
    const res = await request(gateway).post('/auth/sign-in?x=1').set('Cookie', 'access_token=abc').send({email: 'a@test.dev'})
    expect(res.status).toBe(200)
    expect(res.body.service).toBe('auth')
    expect(res.body.url).toBe('/auth/sign-in?x=1')
    expect(res.body.body).toEqual({email: 'a@test.dev'})
    expect(res.body.headers.cookie).toBe('access_token=abc')
    // the service's cookies reach the browser
    expect(res.headers['set-cookie']?.[0]).toContain('from=auth')
  })

  it('sends the avatar upload to media-service', async () => {
    const res = await request(gateway).post('/auth/upload-avatar').attach('avatar', Buffer.from('x'), 'a.png')
    expect(res.body.service).toBe('media')
  })

  it('does not route paths no service owns, or that only share a prefix', async () => {
    expect((await request(gateway).post('/internal/authenticate').send({})).status).toBe(404)
    expect((await request(gateway).get('/authorize')).status).toBe(404)
  })

  it('refuses dot segments, so a path cannot climb out of /auth into /internal', async () => {
    for(const path of ['/auth/../internal/authenticate', '/auth/%2e%2e/internal/authenticate', '/auth/%2E%2e%2Finternal']) {
      const res = await request(gateway).post(path).send({})
      expect(res.status, path).not.toBe(200)
      expect(res.body.service, path).toBeUndefined()
    }
  })
})

describe('internal key', () => {
  it('adds the key and replaces one a client tries to send', async () => {
    const res = await request(gateway).get('/auth/me').set('x-internal-key', 'forged')
    expect(res.body.headers['x-internal-key']).toBe(process.env.INTERNAL_API_KEY)
  })

  it('adds the client address to X-Forwarded-For', async () => {
    const res = await request(gateway).get('/auth/me')
    expect(res.body.headers['x-forwarded-for']).toBeTruthy()
  })
})

describe('browser checks', () => {
  it('refuses form and text bodies, so other sites cannot post to the api', async () => {
    const form = await request(gateway).post('/auth/sign-in').type('form').send({email: 'a@test.dev'})
    expect(form.status).toBe(415)
    const text = await request(gateway).post('/auth/sign-in').set('Content-Type', 'text/plain').send('hello')
    expect(text.status).toBe(415)
    // multipart only where a file is expected
    const multipart = await request(gateway).post('/auth/sign-in').attach('avatar', Buffer.from('x'), 'a.png')
    expect(multipart.status).toBe(415)
  })

  it('allows only the frontend origin with credentials', async () => {
    const res = await request(gateway).options('/auth/sign-in').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(res.headers['access-control-allow-credentials']).toBe('true')

    const other = await request(gateway).options('/auth/sign-in').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST')
    // the allowed origin is always the frontend's, so the browser blocks any other site
    expect(other.headers['access-control-allow-origin']).toBe('http://localhost:3000')
  })
})

describe('service outage', () => {
  it('answers 502 in the api JSON shape when a service is down', async () => {
    const down = http.createServer()
    await new Promise<void>(resolve => down.listen(0, '127.0.0.1', resolve))
    const target = urlOf(down)
    await new Promise<void>(resolve => down.close(() => resolve()))

    const res = await request(createGatewayApplication({auth: target, media: target})).post('/auth/sign-in').send({})
    expect(res.status).toBe(502)
    expect(res.body).toEqual({success: false, message: 'Service unavailable, please try again later'})
  })
})
