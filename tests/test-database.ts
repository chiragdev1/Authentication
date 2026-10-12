import 'dotenv/config'

// tests never touch the development database: they use the same server with "_test" added to the database name,
// unless TEST_DATABASE_URL points somewhere else
export function getTestDatabaseUrl() {
  if(process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  const devUrl = process.env.DATABASE_URL
  if(!devUrl) {
    throw new Error('Set DATABASE_URL or TEST_DATABASE_URL to run the tests')
  }

  const url = new URL(devUrl)
  url.pathname = `${url.pathname.replace(/^\//, '')}_test`
  return url.toString()
}
