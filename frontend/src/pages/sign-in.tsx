import { useLocation, useNavigate } from 'react-router'
import { api, ApiRequestError } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useAction } from '../lib/use-action.ts'
import { Alert, AuthPage, Button, Field, TextLink } from '../components/ui.tsx'

export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const { reloadUser } = useAuth()
  const notice = (location.state as { notice?: string } | null)?.notice

  const { pending, error, onSubmit } = useAction(async form => {
    try {
      await api('/auth/sign-in', {
        method: 'POST',
        body: { email: String(form.get('email')), password: String(form.get('password')) },
      })
    } catch (caught) {
      // 403 = right password, unverified email; the api has already re-sent the link if the old one expired
      if(caught instanceof ApiRequestError && caught.status === 403) {
        throw new Error('Your email isn\'t verified yet. Check your inbox for the verification link.')
      }
      throw caught
    }
    await reloadUser()
    const from = (location.state as { from?: string } | null)?.from
    navigate(from ?? '/dashboard', { replace: true })
  })

  return (
    <AuthPage title="Welcome back" subtitle="Sign in to your account." footer={<>New here? <TextLink to="/sign-up">Create an account</TextLink></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        {notice && !error && <Alert kind="success">{notice}</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required minLength={6} />
        <div className="flex justify-end text-sm">
          <TextLink to="/forgot-password">Forgot password?</TextLink>
        </div>
        <Button type="submit" loading={pending} className="w-full">Sign in</Button>
      </form>
    </AuthPage>
  )
}
