import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getTestDatabaseUrl } from './test-database.js'

// creates the test database if it doesn't exist yet, then applies every migration, so the tests run against the real schema
export default async function setup() {
  const testUrl = new URL(getTestDatabaseUrl())
  const databaseName = decodeURIComponent(testUrl.pathname.slice(1))

  const adminUrl = new URL(testUrl)
  adminUrl.pathname = '/postgres'

  const admin = new pg.Client({connectionString: adminUrl.toString()})
  await admin.connect()
  try {
    const {rowCount} = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])
    if(!rowCount) {
      await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`)
    }
  } finally {
    await admin.end()
  }

  const db = drizzle(testUrl.toString())
  await migrate(db, {migrationsFolder: './drizzle'})
  await db.$client.end()
}
