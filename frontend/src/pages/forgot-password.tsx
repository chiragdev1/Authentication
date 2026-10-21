import { useState } from 'react'
import { api } from '../lib/api.ts'
import { useAction } from '../lib/use-action.ts'
import { Alert, AuthPage, Button, Field, TextLink } from '../components/ui.tsx'

export function ForgotPassword() {
  const [sent, setSent] = useState(false)

  const { pending, error, onSubmit } = useAction(async form => {
    await api('/auth/forgot-password', { method: 'POST', body: { email: String(form.get('email')) } })
    setSent(true)
  })

  return (
    <AuthPage title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password." footer={<TextLink to="/sign-in">Back to sign in</TextLink>}>
      {sent ? (
        <Alert kind="success">If an account exists for that email, a reset link is on its way. It expires in 15 minutes.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Button type="submit" loading={pending} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthPage>
  )
}
