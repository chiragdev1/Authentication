import {z} from 'zod'
import { baseEnvShape, loadEnv } from '@authentication/shared/load-env'

const envModel = z.object({
  ...baseEnvShape,
  // the only public port; the services behind it listen on loopback
  GATEWAY_PORT: z.coerce.number().int().positive().default(9000),

  AUTH_SERVICE_URL: z.url().default('http://127.0.0.1:9001'),
  MEDIA_SERVICE_URL: z.url().default('http://127.0.0.1:9002'),

  FRONTEND_URL: z.url().optional(),
})
// without it CORS would allow localhost in production
.refine(env => env.NODE_ENV !== 'production' || env.FRONTEND_URL, {
  message: 'FRONTEND_URL is required in production',
  path: ['FRONTEND_URL'],
})

const parsed = loadEnv(envModel)

export const env = {
  ...parsed,
  FRONTEND_URL: parsed.FRONTEND_URL ?? 'http://localhost:3000',
}
