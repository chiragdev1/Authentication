import {z} from 'zod'
import { baseEnvShape, loadEnv } from '@authentication/shared/load-env'

const envModel = z.object({
  ...baseEnvShape,
  MEDIA_SERVICE_PORT: z.coerce.number().int().positive().default(9002),
  // only the gateway should reach this service, so it listens on loopback unless told otherwise
  SERVICE_HOST: z.string().min(1).default('127.0.0.1'),

  // sessions and the users table belong to auth-service, so this service asks it who the user is and where to save the avatar
  AUTH_SERVICE_URL: z.url().default('http://127.0.0.1:9001'),

  // optional so the service can start without it; uploads fail with 502 until it is set
  IMAGEKIT_PRIVATE_KEY: z.string().min(1).optional(),
  IMAGEKIT_FOLDER: z.string().regex(/^\/[\w\-/]*$/, 'must be a folder path such as /avatars').default('/avatars'),

  // optional: without it the upload limit is counted per process
  REDIS_URL: z.url().optional(),

  // number of proxies in front of the gateway; the gateway itself is counted on top of this
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})

export const env = loadEnv(envModel)
