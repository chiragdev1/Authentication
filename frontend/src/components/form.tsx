import { useState, type ComponentProps, type ReactNode } from 'react'
import { AlertTriangle, Check, CheckCircle2, Eye, EyeOff, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { passwordRequirements } from '@/lib/validation.ts'
import { scorePassword, strengthLevels } from '@/lib/password-strength.ts'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'

type FieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: ReactNode
  // sits on the right of the label, e.g. "Forgot password?"
  action?: ReactNode
  optional?: boolean
}

export function TextField({ label, error, hint, action, optional, className, ...props }: FieldProps) {
  return (
    <FieldShell id={props.id} label={label} error={error} hint={hint} action={action} optional={optional}>
      <Input className={cn('h-10 bg-card', className)} {...props} />
    </FieldShell>
  )
}

export function PasswordField({ showStrength, label, error, hint, action, optional, className, ...props }: FieldProps & { showStrength?: boolean }) {
  const [visible, setVisible] = useState(false)
  const value = String(props.value ?? '')

  return (
    <FieldShell id={props.id} label={label} error={error} hint={hint} action={action} optional={optional}>
      <div className="relative">
        <Input
          {...props}
          type={visible ? 'text' : 'password'}
          className={cn('h-10 bg-card pr-11', className)}
          // a revealed password is plain text, and spellcheck could send it to a cloud dictionary
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          onClick={() => setVisible(shown => !shown)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={props.id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && <PasswordStrength password={value} />}
    </FieldShell>
  )
}

function FieldShell({ id, label, error, hint, action, optional, children }: Pick<FieldProps, 'id' | 'label' | 'error' | 'hint' | 'action' | 'optional'> & { children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8rem] font-medium tracking-wide">
          {label}
          {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
        </Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[0.8rem] text-destructive animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[0.8rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password)
  const level = strengthLevels[score]
  const requirements = passwordRequirements(password)

  return (
    <div className="space-y-2.5 pt-1" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map(step => (
            <span key={step} className={cn('h-1.5 rounded-full transition-colors duration-300', password && score >= step ? level.tone : 'bg-muted')} />
          ))}
        </div>
        <span className="font-display w-20 text-right text-xs tracking-widest text-muted-foreground uppercase">
          {password ? level.label : 'Strength'}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem]">
        {requirements.map(rule => (
          <li key={rule.label} className={cn('flex items-center gap-1.5 transition-colors', rule.met ? 'text-success' : 'text-muted-foreground')}>
            {rule.met ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-60" />}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

const alertIcons = { error: AlertTriangle, success: CheckCircle2, info: Info }
const alertStyles = {
  error: 'border-destructive/40 bg-destructive/8 text-destructive',
  success: 'border-success/40 bg-success/10 text-success',
  info: 'border-brass/40 bg-brass/10 text-foreground [&>svg]:text-brass',
}

export function FormAlert({ kind, children }: { kind: 'error' | 'success' | 'info', children: ReactNode }) {
  const Icon = alertIcons[kind]
  return (
    <Alert role={kind === 'error' ? 'alert' : 'status'} className={cn('animate-in fade-in', alertStyles[kind])}>
      <Icon />
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  )
}
