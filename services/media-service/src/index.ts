import http from "node:http"
// env is imported first, so a bad configuration stops the process before anything else starts
import { env } from "./config/env.js";
import { createExpressApplication } from "./app.js";

const server = http.createServer(createExpressApplication())

server.listen(env.MEDIA_SERVICE_PORT, env.SERVICE_HOST, () => {
  console.log(`media-service is running on ${env.SERVICE_HOST}:${env.MEDIA_SERVICE_PORT} in ${env.NODE_ENV} mode`)
})
