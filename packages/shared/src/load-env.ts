import dotenv from 'dotenv'
import { z } from 'zod'

// this branch runs next to the main app, which owns .env, so the services read their own file at the repo root.
// pnpm runs each service from its own folder, hence the relative path; variables already set (tests, CI) are never overridden
dotenv.config({path: ['.env.microservices', '../../.env.microservices'], quiet: true})

// settings every service has
export const baseEnvShape = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // shared secret that proves a request came from the gateway or another service
  INTERNAL_API_KEY: z.string().min(32, 'must be at least 32 characters'),
  // prepended to the auth cookie names, so this app's cookies don't overwrite another app's on the same host (see cookies.ts)
  COOKIE_PREFIX: z.string().regex(/^[A-Za-z0-9_]*$/, 'letters, digits and _ only').default(''),
}

// every setting is checked once at startup, so a missing secret fails the boot instead of the first request
export function loadEnv<T extends z.ZodType>(model: T): z.output<T> {
  const result = model.safeParse(process.env)

  if(!result.success) {
    // only the variable names and rules are printed, never the values
    console.error(`Invalid environment variables:\n${result.error.issues.map(issue => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')}`)
    process.exit(1)
  }

  return result.data
}
