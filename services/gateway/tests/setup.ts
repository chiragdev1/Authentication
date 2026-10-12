// set before the app is imported
process.env.NODE_ENV = 'test'
process.env.INTERNAL_API_KEY = 'test-internal-key-that-is-at-least-32-chars'
process.env.FRONTEND_URL = 'http://localhost:3000'
// the documented cookie names, whatever .env.microservices sets locally
process.env.COOKIE_PREFIX = ''
