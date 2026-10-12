import dotenv from 'dotenv'
import { Redis } from 'ioredis'

// local testing only: prints the link (and its token) from the newest email job for an address, read from the queue,
// for when the mail can't or shouldn't be delivered. the job holds a live token, so never point this at production
dotenv.config({path: ['.env.microservices', '../../.env.microservices'], quiet: true})

const email = process.argv[2]?.trim().toLowerCase()
if(!email || !process.env.REDIS_URL) {
  console.error('usage: pnpm --filter @authentication/auth-service dev:last-link <email>   (needs REDIS_URL)')
  process.exit(1)
}
if(process.env.NODE_ENV === 'production') {
  console.error('refusing to run with NODE_ENV=production')
  process.exit(1)
}

const redis = new Redis(process.env.REDIS_URL)
try {
  const ids = await redis.keys('bull:email:[0-9]*')
  let newest = null
  for(const key of ids) {
    const [data, timestamp] = await redis.hmget(key, 'data', 'timestamp')
    if(!data) continue
    const job = JSON.parse(data)
    const link = job.verificationUrl ?? job.resetUrl
    if(job.to === email && link && (!newest || Number(timestamp) > newest.timestamp)) {
      newest = {timestamp: Number(timestamp), type: job.type, link}
    }
  }
  if(!newest) {
    console.error(`no verification or reset email queued for ${email}`)
    process.exitCode = 1
  } else {
    console.log(`${newest.type} (${new Date(newest.timestamp).toISOString()})`)
    console.log(newest.link)
    console.log(`token: ${new URL(newest.link).searchParams.get('token')}`)
  }
} finally {
  redis.disconnect()
}
