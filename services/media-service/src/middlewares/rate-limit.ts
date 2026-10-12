import { createRateLimiterFactory, HOUR, userKey } from '@authentication/shared/rate-limit'
import { env } from '../config/env.js'

const limiter = createRateLimiterFactory({redisUrl: env.REDIS_URL, prefix: 'media', disabled: env.NODE_ENV === 'test'})

export const rateLimits = {
  uploadAvatarPerUser: limiter({name: 'upload-avatar-user', windowMs: HOUR, limit: 10, key: userKey}),
}
