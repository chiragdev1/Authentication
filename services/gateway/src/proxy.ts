import type { ServerResponse } from 'node:http'
import { createProxyMiddleware, proxyEventsPlugin, type RequestHandler } from 'http-proxy-middleware'
import { INTERNAL_KEY_HEADER } from '@authentication/shared/internal-auth'
import { env } from './config/env.js'

// forwards every request under `prefix` to `target`, body and cookies untouched, so the service sees what the client sent
export function proxyTo(target: string, prefix: string): RequestHandler {
  return createProxyMiddleware({
    target,
    // a plain string filter would also match /authorize under /auth
    pathFilter: (pathname) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    // appends the client's address to X-Forwarded-For; services trust one more proxy than TRUST_PROXY to read it back
    xfwd: true,
    // replaces any x-internal-key the client sent, so only the gateway can vouch for a request
    headers: {[INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY},
    proxyTimeout: 30 * 1000,
    // the default plugins answer errors in plain text and log the full url; this answers in the api's JSON shape instead
    ejectPlugins: true,
    plugins: [proxyEventsPlugin],
    on: {
      error: (error, req, res) => {
        console.error(`Proxy to ${target} failed for ${req.method} ${req.url?.split('?')[0]}:`, error.message)
        if(!('writeHead' in res)) {
          res.destroy()
          return
        }
        const response = res as ServerResponse
        if(!response.headersSent) {
          response.writeHead(502, {'content-type': 'application/json'})
        }
        response.end(JSON.stringify({success: false, message: 'Service unavailable, please try again later'}))
      },
    },
  })
}
