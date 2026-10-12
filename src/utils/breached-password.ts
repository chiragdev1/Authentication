import crypto from 'crypto'

const PWNED_RANGE_URL = 'https://api.pwnedpasswords.com/range/'
const TIMEOUT_MS = 2000

// k-anonymity: only the first 5 characters of the SHA-1 hash leave the server, never the password or its full hash.
// if the service is slow or down the password is allowed, so an outage there can't block sign ups and resets here
export async function isPasswordBreached(password: string): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  try {
    const response = await fetch(`${PWNED_RANGE_URL}${prefix}`, {
      // padding makes every response the same size, so the prefix can't be guessed from the response length
      headers: {'Add-Padding': 'true'},
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if(!response.ok) {
      console.error(`Breached password check failed with status ${response.status}`)
      return false
    }

    const body = await response.text()

    // each line is SUFFIX:COUNT; padding lines have a count of 0
    return body.split('\n').some(line => {
      const [lineSuffix, count] = line.trim().split(':')
      return lineSuffix === suffix && Number(count) > 0
    })
  } catch (error) {
    console.error('Breached password check failed:', error instanceof Error ? error.message : error)
    return false
  }
}
