import { lazy, Suspense } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth.tsx'
import { Logo, Spinner } from '@/components/brand.tsx'
import { ThemeToggle } from '@/components/theme-toggle.tsx'
import { Button } from '@/components/ui/button.tsx'

// signed-in only, so its menu code stays out of the bundle every visitor downloads (user-menu.tsx)
const UserMenu = lazy(() => import('@/components/user-menu.tsx'))

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        {/* the app pages are lazy-loaded (app.tsx); header and footer stay put while one arrives */}
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        {onHome && (
          <div className="font-display hidden items-center gap-7 text-sm tracking-[0.15em] text-muted-foreground uppercase md:flex">
            <a href="#defenses" className="transition-colors hover:text-foreground">Defenses</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          </div>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {loading ? (
            <div className="h-9 w-24" />
          ) : user ? (
            <Suspense fallback={<div className="size-9" />}>
              <UserMenu />
            </Suspense>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/sign-up">Enlist</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p className="font-display tracking-[0.2em] uppercase">
          © {new Date().getFullYear()} CKAuth · Hold the wall
          {/* "dedicate your hearts": the salute, for whoever notices */}
          <span lang="ja" title="Dedicate your hearts" className="ml-3 tracking-normal normal-case">心臓を捧げよ</span>
        </p>
        <div className="flex gap-5">
          <Link to="/sign-in" className="hover:text-foreground">Sign in</Link>
          <Link to="/sign-up" className="hover:text-foreground">Create account</Link>
          <Link to="/forgot-password" className="hover:text-foreground">Recover access</Link>
        </div>
      </div>
    </footer>
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
