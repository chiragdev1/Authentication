import http from "node:http"
// env is imported first, so a bad configuration stops the process before any client (database, queue) is created
import { env } from "./config/env.js";
import { createExpressApplication } from "./app/index.js";

async function main() {
  try {
    const server = http.createServer(createExpressApplication())

    server.listen(env.AUTH_SERVICE_PORT, env.SERVICE_HOST, () => {
      console.log(`auth-service is running on ${env.SERVICE_HOST}:${env.AUTH_SERVICE_PORT} in ${env.NODE_ENV} mode`)
    })
  } catch (error) {
    console.error(`Error in starting http server, ${error}`)
    process.exit(1)
  }
}

main()
