import { useEffect, useState } from 'react'

// reads ?token= once, then removes it from the address bar and history,
// so the single-use secret doesn't linger in screenshots, shared urls or the back button
export function useUrlToken() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))

  useEffect(() => {
    if(token) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
    }
  }, [token])

  return token
}
