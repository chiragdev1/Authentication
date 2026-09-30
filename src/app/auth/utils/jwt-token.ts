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

// read the expiry date from a signed token (used to set cookie expiry)
export function getTokenExpiry(token: string) {
  const payload = jwt.decode(token) as jwt.JwtPayload
  return new Date(payload.exp! * 1000)
}
