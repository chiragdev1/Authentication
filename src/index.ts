import http from "node:http"
import "dotenv/config"
import { createExpressApplication } from "./app/index.js";

async function main() {
  try {
    const server = http.createServer(createExpressApplication())
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