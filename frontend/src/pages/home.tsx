import { Link } from 'react-router'
import { useAuth } from '../lib/auth.tsx'

const features = [
  { title: 'Verified sign-ups', body: 'Single-use email links that expire in 15 minutes, confirmed with the password chosen at sign-up.' },
  { title: 'Safe sessions', body: 'Short-lived access tokens in httpOnly cookies, with refresh tokens replaced on every use.' },
  { title: 'Private by design', body: 'Sign-up, sign-in and recovery never reveal whether an email has an account.' },
  { title: 'Password recovery', body: 'Reset by email or change in-app, and every other device is signed out.' },
]

export function Home() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Authentication, done carefully</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Accounts your users can trust.</h1>
        <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400">
          CKAuth handles sign-up, email verification, sessions and password recovery, with the security details already worked out.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/sign-up" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500">Create an account</Link>
              <Link to="/sign-in" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">Sign in</Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {features.map(feature => (
          <div key={feature.title} className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{feature.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
