// set before the app is imported; auth-service and ImageKit are mocked, so nothing is reached
process.env.NODE_ENV = 'test'
process.env.INTERNAL_API_KEY = 'test-internal-key-that-is-at-least-32-chars'
delete process.env.REDIS_URL
// the documented cookie names, whatever .env.microservices sets locally
process.env.COOKIE_PREFIX = ''
