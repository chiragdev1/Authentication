import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { PG_ADMIN_URL, TEST_DATABASE_URL } from './env.js'

// Runs once before the whole suite, in the main Vitest process.
// It builds a fresh `auth_test` database from the same migrations production uses,
// so the tests always run against the current schema in ./drizzle.
export async function setup() {
  // CREATE/DROP DATABASE can't run while connected to that database,
  // so connect to the default `postgres` database to do it
  const admin = new pg.Client(PG_ADMIN_URL)
  await admin.connect()
  await admin.query('DROP DATABASE IF EXISTS auth_test WITH (FORCE)')
  await admin.query('CREATE DATABASE auth_test')
  await admin.end()

  // apply every migration in ./drizzle to the empty database
  const db = drizzle(TEST_DATABASE_URL)
  await migrate(db, { migrationsFolder: './drizzle' })
  await db.$client.end()
}
