import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <img src="/favicon.svg" alt="" className="size-7" />
      <span>CKAuth</span>
    </Link>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </div>
  )
}

// centred single-card layout used by every auth page
export function AuthPage({ title, subtitle, children, footer }: { title: string, subtitle?: ReactNode, children: ReactNode, footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">{footer}</p>}
    </div>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string, hint?: string }

export function Field({ label, hint, id, ...props }: FieldProps) {
  const inputId = id ?? props.name
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
      <input
        id={inputId}
        className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950"
        {...props}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean, variant?: 'primary' | 'secondary' | 'danger' }

const buttonVariants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'border border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950',
}

export function Button({ loading, variant = 'primary', className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info', children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300',
  }
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2.5 text-sm ${styles[kind]}`}>{children}</div>
}

export function TextLink({ to, children }: { to: string, children: ReactNode }) {
  return <Link to={to} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">{children}</Link>
}

export function Spinner() {
  return (
    <div className="flex justify-center py-24">
      <span className="size-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  )
}
