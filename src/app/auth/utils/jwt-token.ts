import jwt, {type SignOptions} from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()


export function generateAccessToken(payload: object) {
  const secret = process.env.ACCESS_TOKEN_SECRET_KEY as string
  const token = jwt.sign(payload, secret, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY as NonNullable<SignOptions['expiresIn']> })
  return token
}

export function generateRefreshToken(payload: object) {
  const secret = process.env.REFRESH_TOKEN_SECRET_KEY as string
  const token = jwt.sign(payload, secret, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY as NonNullable<SignOptions['expiresIn']> })
  return token
}
