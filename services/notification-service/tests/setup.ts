// set before the worker is imported; mail.ts is mocked, so neither Redis nor Resend is reached
process.env.NODE_ENV = 'test'
process.env.REDIS_URL = 'redis://localhost:6379/15'
process.env.RESEND_API_KEY = 're_test_key_never_used'
