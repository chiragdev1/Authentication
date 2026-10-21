import { useState } from 'react'
import { api } from '../lib/api.ts'
import { useAction } from '../lib/use-action.ts'
import { Alert, AuthPage, Button, Field, TextLink } from '../components/ui.tsx'

export function SignUp() {
  const [sentTo, setSentTo] = useState<string | null>(null)

  const { pending, error, onSubmit } = useAction(async form => {
    const email = String(form.get('email'))
    const lastName = String(form.get('lastName')).trim()
    await api('/auth/sign-up', {
      method: 'POST',
      body: {
        firstName: String(form.get('firstName')).trim(),
        lastName: lastName || null,
        email,
        password: String(form.get('password')),
      },
    })
    setSentTo(email)
  })

  // the api answers the same for new and existing emails, so this screen must too
  if(sentTo) {
    return (
      <AuthPage title="Check your inbox" subtitle={<>We've sent a message to <strong>{sentTo}</strong>. Follow the link in it to finish creating your account.</>}>
        <Alert kind="info">The link expires in 15 minutes. You'll need the password you just chose to confirm it.</Alert>
      </AuthPage>
    )
  }

  return (
    <AuthPage title="Create your account" footer={<>Already have an account? <TextLink to="/sign-in">Sign in</TextLink></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" autoComplete="given-name" required minLength={2} maxLength={45} />
          <Field label="Last name" name="lastName" autoComplete="family-name" maxLength={45} />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={6} maxLength={72} hint="6 to 72 characters." />
        <Button type="submit" loading={pending} className="w-full">Create account</Button>
      </form>
    </AuthPage>
  )
}
