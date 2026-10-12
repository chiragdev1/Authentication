import crypto from 'crypto'
import type { Request, Response } from 'express'
import { and, eq, gt, isNotNull, isNull, lt, ne, or } from 'drizzle-orm'

import { db } from '../../../db/index.js'
import { sessionsTable } from '../../../db/schema.js'
import { ApiError } from '@authentication/shared/api-error'
import { generateAccessToken, generateRefreshToken, getTokenExpiry, type SessionClaims } from './jwt-token.js'
import { COOKIE_NAMES, cookieOptions, REFRESH_REUSE_GRACE_MS, refreshCookieOptions } from './constants.js'

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export type SessionTokens = {accessToken: string, refreshToken: string}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string, req: Request): Promise<SessionTokens> {
  const now = new Date()

  // expired and revoked sessions are only kept until the user's next sign in, so the table can't grow forever without a cron job
  await db.delete(sessionsTable).where(and(
    eq(sessionsTable.userId, userId),
    or(lt(sessionsTable.expiresAt, now), isNotNull(sessionsTable.revokedAt))
  ))

  const sid = crypto.randomUUID()
  const accessToken = generateAccessToken({userId, sid})
  const refreshToken = generateRefreshToken({userId, sid})

  const [session] = await db.insert(sessionsTable).values({
    id: sid,
    userId,
    tokenHash: hashToken(refreshToken),
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
    ip: req.ip ?? null,
    expiresAt: getTokenExpiry(refreshToken),
  }).returning({id: sessionsTable.id})

  if(!session) {
    throw ApiError.internal('Could not create session')
  }

  return {accessToken, refreshToken}
}

// swaps the session's refresh token for a new one. the swap only happens if the presented token is still the current one,
// so two refreshes with the same token can't both succeed
export async function rotateSession(claims: SessionClaims, presentedToken: string): Promise<SessionTokens> {
  const presentedHash = hashToken(presentedToken)
  const accessToken = generateAccessToken(claims)
  const refreshToken = generateRefreshToken(claims)
  const now = new Date()

  const [rotated] = await db.update(sessionsTable).set({
    tokenHash: hashToken(refreshToken),
    prevTokenHash: presentedHash,
    lastUsedAt: now,
    expiresAt: getTokenExpiry(refreshToken),
  })
  .where(and(
    eq(sessionsTable.id, claims.sid),
    eq(sessionsTable.userId, claims.userId),
    eq(sessionsTable.tokenHash, presentedHash),
    isNull(sessionsTable.revokedAt),
    gt(sessionsTable.expiresAt, now)
  ))
  .returning({id: sessionsTable.id})

  if(rotated) {
    return {accessToken, refreshToken}
  }

  const [session] = await db.select({prevTokenHash: sessionsTable.prevTokenHash, lastUsedAt: sessionsTable.lastUsedAt, revokedAt: sessionsTable.revokedAt})
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, claims.sid), eq(sessionsTable.userId, claims.userId)))

  if(!session || session.revokedAt) {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }

  // the token that was replaced a moment ago: another tab refreshed first. reject this request, but leave the session alone
  const isJustReplaced = session.prevTokenHash === presentedHash && now.getTime() - session.lastUsedAt.getTime() < REFRESH_REUSE_GRACE_MS
  if(isJustReplaced) {
    throw ApiError.unauthorized('Session was refreshed by another request, retry with the new cookie')
  }

  // the signature is valid and names this session, but it is an old token: someone kept a copy. end the session for whoever holds it
  await revokeSession(claims.sid, claims.userId)
  console.warn(`Refresh token reuse detected, session ${claims.sid} revoked`)
  throw ApiError.unauthorized('Invalid or expired refresh token')
}

export async function revokeSession(sid: string, userId: string, executor: Executor = db) {
  const [revoked] = await executor.update(sessionsTable).set({revokedAt: new Date()})
    .where(and(eq(sessionsTable.id, sid), eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)))
    .returning({id: sessionsTable.id})
  return revoked
}

export async function revokeSessionByRefreshToken(refreshToken: string) {
  await db.update(sessionsTable).set({revokedAt: new Date()})
    .where(and(eq(sessionsTable.tokenHash, hashToken(refreshToken)), isNull(sessionsTable.revokedAt)))
}

export async function revokeAllSessions(userId: string, options: {except?: string | undefined} = {}, executor: Executor = db) {
  await executor.update(sessionsTable).set({revokedAt: new Date()})
    .where(and(
      eq(sessionsTable.userId, userId),
      isNull(sessionsTable.revokedAt),
      options.except ? ne(sessionsTable.id, options.except) : undefined
    ))
}

export function setAuthCookies(res: Response, tokens: SessionTokens) {
  res.cookie(COOKIE_NAMES.access, tokens.accessToken, {...cookieOptions, expires: getTokenExpiry(tokens.accessToken)})
  res.cookie(COOKIE_NAMES.refresh, tokens.refreshToken, {...refreshCookieOptions, expires: getTokenExpiry(tokens.refreshToken)})
  clearLegacyRefreshCookie(res)
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.access, cookieOptions)
  res.clearCookie(COOKIE_NAMES.refresh, refreshCookieOptions)
  clearLegacyRefreshCookie(res)
}

// refresh cookies set before it moved to path /auth are a separate cookie to the browser and must be cleared on their own path
function clearLegacyRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAMES.refresh, {...cookieOptions, path: '/'})
}
