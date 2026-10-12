import { getTestDatabaseUrl } from './test-database.js'

// set before the app is imported; dotenv never overrides a variable that is already set
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = getTestDatabaseUrl()
process.env.FRONTEND_URL = 'http://localhost:3000'
process.env.RESEND_API_KEY ??= 're_test_key_never_used'
delete process.env.REDIS_URL
