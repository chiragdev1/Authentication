import { NextFunction, Request, Response } from "express";


export function authenticateToken(
  req: Request & { cookies: { access_token?: string } },
  res: Response,
  next: NextFunction,
) {
  // extract the token from req.cookies
  const token = req.cookies.access_token;
}