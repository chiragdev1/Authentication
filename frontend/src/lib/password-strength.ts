// the meter is advisory: validateNewPassword() in validation.ts is the hard gate, this tells people how far past it they are
export type StrengthScore = 0 | 1 | 2 | 3 | 4

export const strengthLevels: Record<StrengthScore, { label: string, tone: string }> = {
  0: { label: 'Breached', tone: 'bg-destructive' },
  1: { label: 'Weak', tone: 'bg-destructive' },
  2: { label: 'Holding', tone: 'bg-brass' },
  3: { label: 'Strong', tone: 'bg-success' },
  4: { label: 'Fortified', tone: 'bg-success' },
}

export function scorePassword(password: string): StrengthScore {
  if(!password) return 0
  // TODO(human): score the password from 0 (trivial) to 4 (excellent)
  return 2
}
