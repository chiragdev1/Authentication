import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UnrecoverableError } from 'bullmq'

vi.mock('../src/mail.js', () => ({
  sendEmailVerificationMail: vi.fn(async () => {}),
  sendWelcomeMail: vi.fn(async () => {}),
  sendResetPasswordMail: vi.fn(async () => {}),
  sendAccountExistsMail: vi.fn(async () => {}),
  sendPasswordChangedMail: vi.fn(async () => {}),
}))

import * as mail from '../src/mail.js'
import { processEmailJob } from '../src/worker.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('email worker', () => {
  it('sends the mail the job names', async () => {
    await processEmailJob({type: 'reset-password', to: 'a@test.dev', firstName: 'Ann', resetUrl: 'http://localhost:3000/reset-password?token=abc'})
    expect(mail.sendResetPasswordMail).toHaveBeenCalledWith('a@test.dev', 'Ann', 'http://localhost:3000/reset-password?token=abc')
    expect(mail.sendWelcomeMail).not.toHaveBeenCalled()
  })

  it('shows the time of the password change, not the time the mail is sent', async () => {
    const changedAt = '2026-01-02T03:04:05.000Z'
    await processEmailJob({type: 'password-changed', to: 'a@test.dev', firstName: 'Ann', forgotPasswordUrl: 'http://localhost:3000/forgot-password', changedAt})
    const [, , , when] = vi.mocked(mail.sendPasswordChangedMail).mock.calls[0]!
    expect(when).toEqual(new Date(changedAt))
  })

  it('fails a job that breaks the contract without retrying it', async () => {
    await expect(processEmailJob({type: 'welcome', to: 'not-an-email', firstName: 'Ann'})).rejects.toBeInstanceOf(UnrecoverableError)
    await expect(processEmailJob({type: 'unknown'})).rejects.toBeInstanceOf(UnrecoverableError)
    expect(mail.sendWelcomeMail).not.toHaveBeenCalled()
  })
})
