import {Resend} from "resend"
import {env} from "./config/env.js"
import {accountExistsEmail, emailVerificationEmail, passwordChangedEmail, resetPasswordEmail, welcomeEmail, type RenderedEmail} from "./templates/emails.js"

const resendClient = new Resend(env.RESEND_API_KEY)
const from = env.EMAIL_FROM

async function sendEmail(to: string, {subject, html, text}: RenderedEmail) {
  const {data, error} = await resendClient.emails.send({
    to,
    from,
    html,
    subject,
    text,
  })

  if (error) {
    // the subject identifies the mail; the address stays out of the logs
    console.error(`Failed to send email "${subject}":`, error)
    // thrown so BullMQ retries the job
    throw new Error(`Failed to send email "${subject}"`)
  }

  return data
}

export function sendEmailVerificationMail(to: string, verificationUrl: string) {
  return sendEmail(to, emailVerificationEmail({to, verificationUrl}))
}

export function sendWelcomeMail(to: string, firstName: string) {
  return sendEmail(to, welcomeEmail({to, firstName}))
}

export function sendResetPasswordMail(to: string, firstName: string, resetUrl: string) {
  return sendEmail(to, resetPasswordEmail({to, firstName, resetUrl}))
}

// sent when someone signs up with an email that already has a verified account
export function sendAccountExistsMail(to: string, firstName: string, signinUrl: string, forgotPasswordUrl: string) {
  return sendEmail(to, accountExistsEmail({to, firstName, signinUrl, forgotPasswordUrl}))
}

// sent after a password reset or change; it is the owner's only signal if someone else did it.
// changedAt comes from auth-service, so a mail that waited in the queue still shows when the change happened
export function sendPasswordChangedMail(to: string, firstName: string, forgotPasswordUrl: string, changedAt: Date) {
  return sendEmail(to, passwordChangedEmail({to, firstName, forgotPasswordUrl, changedAt}))
}
