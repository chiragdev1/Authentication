// writes every email to preview/<name>.html with sample data, to look at the design in a browser before sending anything.
// run with: pnpm --filter @authentication/notification-service preview
import { mkdir, writeFile } from 'node:fs/promises'

// the templates only need APP_NAME and FRONTEND_URL; these keep the env check happy without real secrets
process.env.REDIS_URL ??= 'redis://localhost:6380'
process.env.RESEND_API_KEY ??= 're_preview_only'

const emails = await import('../src/templates/emails.js')
const to = 'ada@example.com'
const app = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const token = 'a3f1c9e8b2d7465f9e0c1b2a3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6'

const rendered = {
  'email-verification': emails.emailVerificationEmail({to, verificationUrl: `${app}/verify-email?token=${token}`}),
  'welcome': emails.welcomeEmail({to, firstName: 'Ada'}),
  'reset-password': emails.resetPasswordEmail({to, firstName: 'Ada', resetUrl: `${app}/reset-password?token=${token}`}),
  'account-exists': emails.accountExistsEmail({to, firstName: 'Ada', signinUrl: `${app}/sign-in`, forgotPasswordUrl: `${app}/forgot-password`}),
  'password-changed': emails.passwordChangedEmail({to, firstName: 'Ada', forgotPasswordUrl: `${app}/forgot-password`, changedAt: new Date()}),
}

await mkdir('preview', {recursive: true})
for(const [name, email] of Object.entries(rendered)) {
  await writeFile(`preview/${name}.html`, email.html)
  await writeFile(`preview/${name}.txt`, `Subject: ${email.subject}\n\n${email.text}\n`)
  console.log(`preview/${name}.html  —  ${email.subject}`)
}
