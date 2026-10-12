import { getTestDatabaseUrl } from './test-database.js'

// set before the app is imported; dotenv never overrides a variable that is already set
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = getTestDatabaseUrl()
process.env.FRONTEND_URL = 'http://localhost:3000'
process.env.INTERNAL_API_KEY = 'test-internal-key-that-is-at-least-32-chars'
// the mail module is mocked and rate limits are off under test, so nothing connects to this
process.env.REDIS_URL = 'redis://localhost:6379/15'
// the documented cookie names, whatever .env.microservices sets locally
process.env.COOKIE_PREFIX = ''
