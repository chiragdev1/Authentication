import { useNavigate } from 'react-router'
import { api } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useAction } from '../lib/use-action.ts'
import { useUrlToken } from '../lib/use-url-token.ts'
import { Alert, AuthPage, Button, Field, TextLink } from '../components/ui.tsx'

export function ResetPassword() {
  const token = useUrlToken()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const { pending, error, onSubmit } = useAction(async form => {
    const newPassword = String(form.get('newPassword'))
    if(newPassword !== form.get('confirmPassword')) {
      throw new Error('The passwords don\'t match')
    }
    await api(`/auth/reset-password/${encodeURIComponent(token!)}`, { method: 'POST', body: { newPassword } })
    // the reset revoked every session; clear this browser's cookies too
    await signOut()
    navigate('/sign-in', { replace: true, state: { notice: 'Password updated. Sign in with your new password.' } })
  })

  if(!token) {
    return (
      <AuthPage title="This link doesn't work" footer={<TextLink to="/forgot-password">Request a new link</TextLink>}>
        <Alert kind="error">The reset link is missing its token. Open the link from your email again.</Alert>
      </AuthPage>
    )
  }

  return (
    <AuthPage title="Choose a new password" subtitle="You'll be signed out on every device." footer={<TextLink to="/forgot-password">Request a new link</TextLink>}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={72} hint="6 to 72 characters." />
        <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={72} />
        <Button type="submit" loading={pending} className="w-full">Update password</Button>
      </form>
    </AuthPage>
  )
}
