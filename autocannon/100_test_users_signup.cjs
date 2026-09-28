const autocannon = require('autocannon')

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'
const TOTAL_USERS = Number(process.env.TOTAL_USERS) || 100
const CONNECTIONS = Number(process.env.CONNECTIONS) || 10

let counter = 100

const statusCounts = {}

const instance = autocannon(
  {
    url: BASE_URL,
    connections: CONNECTIONS,
    amount: TOTAL_USERS, // stop after exactly TOTAL_USERS requests
    requests: [
      {
        method: 'POST',
        path: '/auth/sign-up',
        headers: { 'content-type': 'application/json' },
        setupRequest: (req) => {
          const n = ++counter
          return {
            ...req,
            body: JSON.stringify({
              firstName: `Test${n}`,
              lastName: `User${n}`,
              age: 18 + (n % 50),
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
    console.log(`Users attempted: ${counter}`)
    console.log(`2xx: ${result['2xx']}, non-2xx: ${result.non2xx}, errors: ${result.errors}, timeouts: ${result.timeouts}`)
    console.log(`Latency avg: ${result.latency.average} ms, p99: ${result.latency.p99} ms`)
  }
)

instance.on('response', (_client, statusCode) => {
  statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1
})

autocannon.track(instance, { renderProgressBar: true })
