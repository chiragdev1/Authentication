import 'dotenv/config'
import {z} from 'zod'

// every setting is checked once at startup, so a missing secret fails the boot instead of the first sign in
const envModel = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1),

  ACCESS_TOKEN_SECRET_KEY: z.string().min(32, 'must be at least 32 characters'),
  REFRESH_TOKEN_SECRET_KEY: z.string().min(32, 'must be at least 32 characters'),
  // jsonwebtoken durations such as 15m, 1h, 7d
  ACCESS_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]?$/, 'must look like 15m, 1h or 7d').default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().regex(/^\d+[smhd]?$/, 'must look like 15m, 1h or 7d').default('7d'),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).default('team@dsaden.com'),
  APP_NAME: z.string().min(1).default('DSADEN'),

  FRONTEND_URL: z.url().optional(),

  // optional so the server can start without them; only avatar uploads and shared rate limits need them
  IMAGEKIT_PRIVATE_KEY: z.string().min(1).optional(),
  REDIS_URL: z.url().optional(),

  // number of proxies in front of the app; req.ip (and so every per-IP rate limit) depends on it being right
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})
// in production a missing FRONTEND_URL would email every user a link to localhost
.refine(env => env.NODE_ENV !== 'production' || env.FRONTEND_URL, {
  message: 'FRONTEND_URL is required in production',
  path: ['FRONTEND_URL'],
})

const result = envModel.safeParse(process.env)

if(!result.success) {
  // only the variable names and rules are printed, never the values
  console.error(`Invalid environment variables:\n${result.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')}`)
  process.exit(1)
}

export const env = {
  ...result.data,
  FRONTEND_URL: result.data.FRONTEND_URL ?? 'http://localhost:3000',
}
