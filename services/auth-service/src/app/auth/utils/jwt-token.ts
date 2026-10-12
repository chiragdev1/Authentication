import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ApiError } from '@authentication/shared/api-error';
import { env } from '../../../config/env.js';

// both tokens name the session they belong to, so revoking the session row ends both of them
export type SessionClaims = {userId: string, sid: string}

// jwtid makes every token unique, even two issued for the same user in the same second
export function generateAccessToken(claims: SessionClaims) {
  return jwt.sign(claims, env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] & {}, jwtid: crypto.randomUUID(), algorithm: 'HS256' })
}

export function generateRefreshToken(claims: SessionClaims) {
  return jwt.sign(claims, env.REFRESH_TOKEN_SECRET_KEY, { expiresIn: env.REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] & {}, jwtid: crypto.randomUUID(), algorithm: 'HS256' })
}

// read the expiry date from a signed token (used to set cookie and session expiry)
export function getTokenExpiry(token: string) {
  const payload = jwt.decode(token) as jwt.JwtPayload
  return new Date(payload.exp! * 1000)
}

export function verifyAccessToken(token: string) {
  return verifySessionToken(token, env.ACCESS_TOKEN_SECRET_KEY, 'access')
}

export function verifyRefreshToken(token: string) {
  return verifySessionToken(token, env.REFRESH_TOKEN_SECRET_KEY, 'refresh')
}

function verifySessionToken(token: string, secret: string, kind: 'access' | 'refresh'): SessionClaims {
  let payload: string | jwt.JwtPayload
  try {
    // pinning the algorithm means a token can't choose how it gets verified
    payload = jwt.verify(token, secret, {algorithms: ['HS256']})
  } catch {
    throw ApiError.unauthorized(`Invalid or expired ${kind} token`)
  }

  // tokens issued before sessions existed have no sid and are rejected
  if(typeof payload === 'string' || typeof payload.userId !== 'string' || typeof payload.sid !== 'string') {
    throw ApiError.unauthorized(`Invalid ${kind} token payload`)
  }

  return {userId: payload.userId, sid: payload.sid}
}
