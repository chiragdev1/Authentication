import http from "node:http"
import "dotenv/config"
import { createExpressApplication } from "./app/index.js";

async function main() {
  try {
    const server = http.createServer(createExpressApplication())
    // caddy keeps idle upstream connections open far longer than node's 5 s default; if node closes one first,
    // caddy can reuse a dead socket and a POST (sign-in, refresh) fails with a 502, so outlive the proxy instead
    server.keepAliveTimeout = 125_000
    // must be longer than keepAliveTimeout, or node can drop a reused connection mid-request
    server.headersTimeout = 126_000
    const PORT: number = process.env.PORT? +process.env.PORT : 8080

    server.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT} in ${process.env.NODE_ENV} mode`)
    })
  } catch (error) {
    console.error(`Error in starting http server, ${error}`)
    process.exit(1)
  }
}

main()