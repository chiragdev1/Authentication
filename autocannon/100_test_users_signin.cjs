const autocannon = require('autocannon')

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'
const TOTAL_USERS = Number(process.env.TOTAL_USERS) || 200
const CONNECTIONS = Number(process.env.CONNECTIONS) || 200
const DURATION = Number(process.env.DURATION) || 30 // seconds

let counter = 0

const statusCounts = {}

const instance = autocannon(
  {
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    requests: [
      {
        method: 'POST',
        path: '/auth/sign-in',
        headers: { 'content-type': 'application/json' },
        setupRequest: (req) => {
          // Cycle through testuser1..testuserN created by 100_test_users_signup.cjs
          const n = (counter++ % TOTAL_USERS) + 1
          return {
            ...req,
            body: JSON.stringify({
              email: `testuser${n}@example.com`,
              password: 'password123',
            }),
          }
        },
      },
    ],
  },
  (err, result) => {
    if (err) {
      console.error('Autocannon error:', err)
      process.exit(1)
    }
    console.log('\nStatus code breakdown:', statusCounts)
    console.log(`Sign-in requests sent: ${counter}`)
    console.log(`2xx: ${result['2xx']}, non-2xx: ${result.non2xx}, errors: ${result.errors}, timeouts: ${result.timeouts}`)
    console.log(`Requests/sec avg: ${result.requests.average}`)
    console.log(`Latency avg: ${result.latency.average} ms, p99: ${result.latency.p99} ms`)
  }
)

instance.on('response', (_client, statusCode) => {
  statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1
})

autocannon.track(instance, { renderProgressBar: true })
