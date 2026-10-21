import { useState, type FormEvent } from 'react'
import { errorMessage } from './api.ts'

// wraps a form submit with pending + error state, so every page handles failures the same way
export function useAction(action: (form: FormData) => Promise<void>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await action(new FormData(event.currentTarget))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return { pending, error, setError, onSubmit }
}
