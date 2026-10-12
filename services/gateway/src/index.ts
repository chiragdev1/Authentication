import http from "node:http"
// env is imported first, so a bad configuration stops the process before the server starts
import { env } from "./config/env.js";
import { createGatewayApplication } from "./app.js";

const server = http.createServer(createGatewayApplication())

server.listen(env.GATEWAY_PORT, () => {
  console.log(`gateway is running on port ${env.GATEWAY_PORT} in ${env.NODE_ENV} mode, forwarding to ${env.AUTH_SERVICE_URL} and ${env.MEDIA_SERVICE_URL}`)
})
