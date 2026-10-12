import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../../utils/api-error.js'

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// the only routes that take a file instead of JSON
const MULTIPART_PATHS = new Set(['/auth/upload-avatar'])

// an HTML form can only send urlencoded, multipart or text/plain bodies, and a cross-origin fetch with a JSON content type
// needs a CORS preflight first. so accepting only JSON means a page on another origin can't make a signed in browser
// call these routes. requests with no body (logout, refresh) send no content type and are let through
export function requireJsonBody(req: Request, res: Response, next: NextFunction) {
  if(!BODY_METHODS.has(req.method) || !req.headers['content-type']) {
    return next()
  }
  if(req.is('application/json')) {
    return next()
  }
  if(MULTIPART_PATHS.has(req.path) && req.is('multipart/form-data')) {
    return next()
  }
  next(new ApiError(415, 'Content-Type must be application/json'))
}
