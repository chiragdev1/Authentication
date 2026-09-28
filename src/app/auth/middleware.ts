import jwt from 'jsonwebtoken'

import type { NextFunction, Request, Response } from "express";
import { ApiError } from '../../utils/api-error.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authenticateToken(
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

  req.userId = payload.userId
  next()
}

// export function authorize(...roles) {
  
// }
