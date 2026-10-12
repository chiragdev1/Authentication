import { ApiError } from '@authentication/shared/api-error'
import { INTERNAL_KEY_HEADER } from '@authentication/shared/internal-auth'
import { env } from '../config/env.js'

const TIMEOUT_MS = 5000

// calls auth-service's /internal routes. a 4xx from it is passed on as is (the user's session has ended, the user is gone);
// anything else means auth-service couldn't answer, which is a 502 here
async function callAuthService<T>(method: string, path: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${env.AUTH_SERVICE_URL}${path}`, {
      method,
      headers: {'content-type': 'application/json', [INTERNAL_KEY_HEADER]: env.INTERNAL_API_KEY},
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    console.error(`auth-service ${method} ${path} failed:`, error instanceof Error ? error.message : error)
    throw new ApiError(502, 'Authentication service is unavailable')
  }

  const payload = await response.json().catch(() => null) as {message?: string, data?: T} | null

  if(response.status >= 400 && response.status < 500) {
    throw new ApiError(response.status, payload?.message ?? 'Request rejected by authentication service')
  }
  if(!response.ok || !payload) {
    console.error(`auth-service ${method} ${path} answered ${response.status}`)
    throw new ApiError(502, 'Authentication service is unavailable')
  }

  return payload.data as T
}

export type AuthenticatedUser = {id: string}

export function authenticate(accessToken: string) {
  return callAuthService<{user: AuthenticatedUser, sessionId: string}>('POST', '/internal/authenticate', {accessToken})
}

// returns the avatar it replaced, for the caller to delete
export function setAvatar(userId: string, avatar: {url: string, fileId: string}) {
  return callAuthService<{previousFileId: string | null}>('PUT', `/internal/users/${encodeURIComponent(userId)}/avatar`, avatar)
}
