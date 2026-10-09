import jwt from 'jsonwebtoken'

import type { NextFunction, Request, Response } from "express";
import { ApiError } from '../../utils/api-error.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { reqUserModel } from './models.js';

declare global {
  namespace Express {
    interface Request {
      user?: unknown
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // extract the token from req.cookies
  const token: string | undefined = req.cookies?.access_token;
  const secret = process.env.ACCESS_TOKEN_SECRET_KEY;

  if(!secret) {
    throw new Error("ACCESS_TOKEN_SECRET_KEY is not set")
  }
  if(!token) {
    throw ApiError.unauthorized("Token not provided")
  }

  // decode the token and extract the id
  let payload: string | jwt.JwtPayload
  try {
    payload = jwt.verify(token, secret)
  } catch {
    throw ApiError.unauthorized("Invalid or expired token")
  }

  if(typeof payload === 'string' || !payload.userId) {
    throw ApiError.unauthorized("Invalid token payload")
  }

  // select only safe fields from the user table and attach it to req.user
  const [userInDb] = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    age: usersTable.age,
    email: usersTable.email,
    emailVerified: usersTable.emailVerified,
    avatarUrl: usersTable.avatarUrl,
  }).from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1)

  // the token is valid but the user no longer exists (e.g. account deleted)
  if(!userInDb) {
    throw ApiError.unauthorized("User not found")
  }

  const safeUser = reqUserModel.parse(userInDb)
  req.user = safeUser
  next()
}

// export function authorize(...roles) {
  
// }

// add middleware to validate cookies before authenticateToken middleware
