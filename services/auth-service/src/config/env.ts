import {z} from 'zod'
import { baseEnvShape, loadEnv } from '@authentication/shared/load-env'

const envModel = z.object({
  ...baseEnvShape,
  AUTH_SERVICE_PORT: z.coerce.number().int().positive().default(9001),
  // only the gateway and other services should reach this service, so it listens on loopback unless told otherwise
  SERVICE_HOST: z.string().min(1).default('127.0.0.1'),

  DATABASE_URL: z.string().min(1),

  ACCESS_TOKEN_SECRET_KEY: z.string().min(32, 'must be at least 32 characters'),
  REFRESH_TOKEN_SECRET_KEY: z.string().min(32, 'must be at least 32 characters'),
  // jsonwebtoken durations such as 15m, 1h, 7d
  ACCESS_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]?$/, 'must look like 15m, 1h or 7d').default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]?$/, 'must look like 15m, 1h or 7d').default('7d'),

  FRONTEND_URL: z.url().optional(),

  // the email queue lives in Redis, and so do the shared rate limit counts
  REDIS_URL: z.url(),

  // number of proxies in front of the gateway; the gateway itself is counted on top of this
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})
// in production a missing FRONTEND_URL would email every user a link to localhost
.refine(env => env.NODE_ENV !== 'production' || env.FRONTEND_URL, {
  message: 'FRONTEND_URL is required in production',
  path: ['FRONTEND_URL'],
})

const parsed = loadEnv(envModel)

export const env = {
  ...parsed,
  FRONTEND_URL: parsed.FRONTEND_URL ?? 'http://localhost:3000',
}
