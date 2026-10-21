import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api, ApiRequestError } from '../lib/api.ts'
import { useAction } from '../lib/use-action.ts'
import { useUrlToken } from '../lib/use-url-token.ts'
import { Alert, AuthPage, Button, Field, TextLink } from '../components/ui.tsx'

export function VerifyEmail() {
  const token = useUrlToken()
  const navigate = useNavigate()
  // once the api rejects the link it can never work again, so hide the form
  const [deadLink, setDeadLink] = useState<string | null>(null)

  const { pending, error, onSubmit } = useAction(async form => {
    try {
      await api(`/auth/verify-email/${encodeURIComponent(token!)}`, {
        method: 'POST',
        body: { password: String(form.get('password')) },
      })
    } catch (caught) {
      if(caught instanceof ApiRequestError && caught.status === 401) {
        setDeadLink('That password didn\'t match, so this link has been cancelled to protect the account. Sign up again or sign in to get a new link.')
        return
      }
      if(caught instanceof ApiRequestError && caught.status === 404) {
        setDeadLink('This link has expired or was already used. Sign in and we\'ll email you a new one.')
        return
      }
      throw caught
    }
    navigate('/sign-in', { replace: true, state: { notice: 'Email verified. You can sign in now.' } })
  })

  if(!token || deadLink) {
    return (
      <AuthPage title="This link doesn't work" footer={<><TextLink to="/sign-in">Sign in</TextLink> · <TextLink to="/sign-up">Sign up</TextLink></>}>
        <Alert kind="error">{deadLink ?? 'The verification link is missing its token. Open the link from your email again.'}</Alert>
      </AuthPage>
    )
  }

  return (
    <AuthPage title="Verify your email" subtitle="Enter the password you chose when you signed up. This proves the account is yours.">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" loading={pending} className="w-full">Verify email</Button>
      </form>
    </AuthPage>
  )
}
