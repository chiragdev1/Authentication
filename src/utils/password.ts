import bcrypt from 'bcrypt'

const BCRYPT_COST = 12

// bcrypt reads at most 72 bytes; longer input is silently cut off, so new passwords are capped in bytes, not characters
export const BCRYPT_MAX_BYTES = 72

// compared against when an account doesn't exist, so a wrong email takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_COST)

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST)
}

// needsRehash is true for hashes made with a lower cost (including the old bcryptjs cost 10 ones), so they can be upgraded at sign in
export async function verifyPassword(password: string, hash: string) {
  const valid = await bcrypt.compare(password, hash)
  return {valid, needsRehash: valid && bcrypt.getRounds(hash) < BCRYPT_COST}
}

export async function verifyDummyPassword(password: string) {
  await bcrypt.compare(password, DUMMY_HASH)
}
