import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { api, errorMessage } from '../lib/api.ts'
import { useAuth } from '../lib/auth.tsx'
import { useAction } from '../lib/use-action.ts'
import { Alert, Button, Card, Field } from '../components/ui.tsx'

// mirrors the api's limits so obvious mistakes fail instantly; the api still checks the real bytes
const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  if(!user) return null

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.firstName}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage your profile and security.</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>Sign out</Button>
      </div>
      <ProfileCard />
      <ChangePasswordCard />
    </div>
  )
}

function ProfileCard() {
  const { user, reloadUser } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success', text: string } | null>(null)
  if(!user) return null

  const initials = `${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if(!file) return

    if(!AVATAR_TYPES.includes(file.type)) {
      return setMessage({ kind: 'error', text: 'Only JPEG, PNG and WebP images are allowed' })
    }
    if(file.size > AVATAR_MAX_BYTES) {
      return setMessage({ kind: 'error', text: 'Avatar must be at most 2 MB' })
    }

    const form = new FormData()
    form.append('avatar', file)
    setUploading(true)
    setMessage(null)
    try {
      await api('/auth/upload-avatar', { method: 'POST', body: form, authed: true })
      await reloadUser()
      setMessage({ kind: 'success', text: 'Profile picture updated' })
    } catch (error) {
      setMessage({ kind: 'error', text: errorMessage(error) })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Profile</h2>
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-20 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800" />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{initials}</div>
          )}
          <div>
            <input ref={fileInput} type="file" accept={AVATAR_TYPES.join(',')} className="hidden" onChange={handleFile} />
            <Button variant="secondary" loading={uploading} onClick={() => fileInput.current?.click()}>
              {user.avatarUrl ? 'Change picture' : 'Upload picture'}
            </Button>
            <p className="mt-1.5 text-xs text-zinc-500">JPEG, PNG or WebP, up to 2 MB.</p>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Name</dt>
          <dd className="font-medium">{[user.firstName, user.lastName].filter(Boolean).join(' ')}</dd>
          <dt className="text-zinc-500">Email</dt>
          <dd className="flex flex-wrap items-center gap-2 font-medium break-all">
            {user.email}
            {user.emailVerified && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Verified</span>}
          </dd>
        </dl>
      </div>
      {message && <div className="mt-4"><Alert kind={message.kind}>{message.text}</Alert></div>}
    </Card>
  )
}

function ChangePasswordCard() {
  const [done, setDone] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const { pending, error, onSubmit } = useAction(async form => {
    const currentPassword = String(form.get('currentPassword'))
    const newPassword = String(form.get('newPassword'))
    if(newPassword !== form.get('confirmPassword')) {
      throw new Error('The new passwords don\'t match')
    }
    setDone(false)
    await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, authed: true })
    setDone(true)
    formRef.current?.reset()
  })

  return (
    <Card>
      <h2 className="font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Other devices will be signed out. This one stays signed in.</p>
      <form ref={formRef} onSubmit={onSubmit} className="mt-5 max-w-sm space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {done && !error && <Alert kind="success">Password changed</Alert>}
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={72} />
        <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={72} />
        <Button type="submit" loading={pending}>Update password</Button>
      </form>
    </Card>
  )
}
