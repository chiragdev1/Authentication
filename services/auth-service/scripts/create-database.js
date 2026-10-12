import dotenv from 'dotenv'
import pg from 'pg'

// creates the database named in DATABASE_URL if it doesn't exist yet, so this branch gets its own database
// on the same Postgres server instead of sharing the main app's
dotenv.config({path: ['.env.microservices', '../../.env.microservices'], quiet: true})

if(!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const url = new URL(process.env.DATABASE_URL)
const databaseName = decodeURIComponent(url.pathname.slice(1))
const adminUrl = new URL(url)
adminUrl.pathname = '/postgres'

const admin = new pg.Client({connectionString: adminUrl.toString()})
await admin.connect()
try {
  const {rowCount} = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])
  if(rowCount) {
    console.log(`Database "${databaseName}" already exists`)
  } else {
    await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`)
    console.log(`Created database "${databaseName}"`)
  }
} finally {
  await admin.end()
}
