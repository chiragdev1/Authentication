import { describe, expect, it } from 'vitest'
import { accountExistsEmail, emailVerificationEmail, passwordChangedEmail, resetPasswordEmail, welcomeEmail } from '../src/templates/emails.js'

const to = 'ada@test.dev'
const url = 'http://localhost:3000/reset-password?token=abc&x=1'

describe('email templates', () => {
  it('escapes names a user chose, so they cannot inject html into the mail', () => {
    const {html, text} = welcomeEmail({to, firstName: '<img src=x onerror=alert(1)>'})
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    // plain text is never rendered as html, so it keeps the name as typed
    expect(text).toContain('<img src=x onerror=alert(1)>')
  })

  it('puts every link in both the html and the text part', () => {
    const emails = [
      emailVerificationEmail({to, verificationUrl: url}),
      resetPasswordEmail({to, firstName: 'Ada', resetUrl: url}),
      accountExistsEmail({to, firstName: 'Ada', signinUrl: url, forgotPasswordUrl: url}),
      passwordChangedEmail({to, firstName: 'Ada', forgotPasswordUrl: url, changedAt: new Date()}),
    ]
    for(const {html, text, subject} of emails) {
      expect(html, subject).toContain('href="http://localhost:3000/reset-password?token=abc&amp;x=1"')
      expect(text, subject).toContain(url)
    }
  })

  it('shows when the password was changed, not when the mail was sent', () => {
    const {html, text} = passwordChangedEmail({to, firstName: 'Ada', forgotPasswordUrl: url, changedAt: new Date('2026-01-02T03:04:05Z')})
    expect(html).toContain('Friday, 2 January 2026 at 03:04 UTC')
    expect(text).toContain('Friday, 2 January 2026 at 03:04 UTC')
  })
})
