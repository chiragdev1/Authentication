import {z} from 'zod'
import { loadEnv } from '@authentication/shared/load-env'

// a queue worker with no http server, so it needs neither ports nor the internal key
const envModel = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  REDIS_URL: z.url(),
  // how many mails are sent at the same time
  EMAIL_CONCURRENCY: z.coerce.number().int().positive().default(5),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).default('team@dsaden.com'),
  APP_NAME: z.string().min(1).default('DSADEN'),

  // linked from the mail footers
  FRONTEND_URL: z.url().default('http://localhost:3000'),
})

export const env = loadEnv(envModel)
