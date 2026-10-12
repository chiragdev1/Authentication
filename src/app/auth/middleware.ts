import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, isNull } from 'drizzle-orm';
import { ApiError } from '../../utils/api-error.js';
import { db } from '../../db/index.js';
import { sessionsTable, usersTable } from '../../db/schema.js';
import { reqUserModel } from './models.js';
import { verifyAccessToken } from './utils/jwt-token.js';

declare global {
  namespace Express {
    interface Request {
      user?: unknown
      sessionId?: string
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token: string | undefined = req.cookies?.access_token;

  if(!token) {
    throw ApiError.unauthorized("Token not provided")
  }

  const {userId, sid} = verifyAccessToken(token)

  // the user is read through its live session, so a revoked session (logout, password change, reuse detected) stops
  // its access token straight away instead of when it expires. this is the query that ran anyway, plus one join
  const [userInDb] = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    age: usersTable.age,
    email: usersTable.email,
    emailVerified: usersTable.emailVerified,
    avatarUrl: usersTable.avatarUrl,
  })
  .from(usersTable)
  .innerJoin(sessionsTable, eq(sessionsTable.userId, usersTable.id))
  .where(and(
    eq(usersTable.id, userId),
    eq(sessionsTable.id, sid),
    isNull(sessionsTable.revokedAt),
    gt(sessionsTable.expiresAt, new Date())
  ))
  .limit(1)

  // the user was deleted, or the session was revoked or has expired
  if(!userInDb) {
    throw ApiError.unauthorized("Session has ended, please sign in again")
  }

  // sessions are only created for verified users, so this only guards against data changed by hand
  if(!userInDb.emailVerified) {
    throw ApiError.forbidden("Please verify your email before signing in")
  }

  req.user = reqUserModel.parse(userInDb)
  req.sessionId = sid
  next()
}
