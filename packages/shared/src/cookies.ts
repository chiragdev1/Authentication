// browsers don't separate cookies by port, so two apps on localhost would overwrite each other's session cookies.
// a prefix keeps them apart; auth-service sets these and media-service reads the access one, so both take the same prefix
export function authCookieNames(prefix: string) {
  return {
    access: `${prefix}access_token`,
    refresh: `${prefix}refresh_token`,
  }
}
