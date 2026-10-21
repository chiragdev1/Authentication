import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth.tsx'
import { Logo, Spinner, TextLink } from './ui.tsx'

export function Layout() {
  const { user, loading } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          {!loading && (
            <div className="flex items-center gap-4 text-sm">
              {user ? (
                <TextLink to="/dashboard">Dashboard</TextLink>
              ) : (
                <>
                  <TextLink to="/sign-in">Sign in</TextLink>
                  <Link to="/sign-up" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500">Get started</Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        © {new Date().getFullYear()} CKAuth
      </footer>
    </div>
  )
}

// the server is the real gate (authenticateToken); this only spares signed-out users a broken page
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if(loading) return <Spinner />
  if(!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// signed-in users have no reason to see sign-in or sign-up
export function GuestOnly() {
  const { user, loading } = useAuth()

  if(loading) return <Spinner />
  if(user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
