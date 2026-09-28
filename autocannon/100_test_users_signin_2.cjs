const autocannon = require("autocannon");

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TOTAL_USERS = Number(process.env.TOTAL_USERS) || 100;
const CONNECTIONS = Number(process.env.CONNECTIONS) || 10;
const DURATION = Number(process.env.DURATION) || 30;

if (
  !Number.isInteger(TOTAL_USERS) ||
  TOTAL_USERS < 1 ||
  !Number.isInteger(CONNECTIONS) ||
  CONNECTIONS < 1 ||
  !Number.isFinite(DURATION) ||
  DURATION <= 0
) {
  throw new Error("TOTAL_USERS, CONNECTIONS and DURATION must be positive.");
}

let preparedRequests = 0;

const instance = autocannon(
  {
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,

    requests: [
      {
        method: "POST",
        path: "/auth/sign-in",
        headers: {
          "content-type": "application/json",
        },

        setupRequest(req) {
          const n = (preparedRequests++ % TOTAL_USERS) + 1;

          return {
            ...req,
            body: JSON.stringify({
              email: `testuser${n}@example.com`,
              password: "password123",
            }),
          };
        },
      },
    ],
  },
  (err, result) => {
    if (err) {
      console.error("Autocannon error:", err);
      process.exitCode = 1;
      return;
    }

    console.log("\n=== Sign-in Benchmark Results ===");
    console.log(`URL: ${BASE_URL}/auth/sign-in`);
    console.log(`Configured users: ${TOTAL_USERS}`);
    console.log(`Connections: ${CONNECTIONS}`);
    console.log(`Duration: ${DURATION}s`);
    console.log(`Requests prepared: ${preparedRequests}`);

    console.log("\n=== Results ===");
    console.log(`2xx responses: ${result["2xx"]}`);
    console.log(`Non-2xx responses: ${result.non2xx}`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log(`Requests/sec (average): ${result.requests.average}`);
    console.log(`Latency average: ${result.latency.average} ms`);
    console.log(`Latency p95: ${result.latency.p95} ms`);
    console.log(`Latency p99: ${result.latency.p99} ms`);
    console.log(`Latency max: ${result.latency.max} ms`);
  },
);

autocannon.track(instance, { renderProgressBar: true });
