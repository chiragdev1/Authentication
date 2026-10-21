import "dotenv/config"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db } from "./index.js"

// runs in production as a one-off container before the api starts, so the image doesn't need drizzle-kit
async function main() {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" })
    console.log("Migrations applied")
  } catch (error) {
    console.error(`Migration failed, ${error}`)
    process.exitCode = 1
  } finally {
    await db.$client.end()
  }
}

main()
