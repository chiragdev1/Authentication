import { z } from 'zod'

// the contract between auth-service (producer) and notification-service (consumer). both sides import it,
// so a renamed field breaks the build instead of silently sending a mail with a missing link
export const EMAIL_QUEUE_NAME = 'email'

const to = z.email()

export const emailJobModel = z.discriminatedUnion('type', [
  z.object({type: z.literal('email-verification'), to, verificationUrl: z.url()}),
  z.object({type: z.literal('welcome'), to, firstName: z.string()}),
  z.object({type: z.literal('reset-password'), to, firstName: z.string(), resetUrl: z.url()}),
  // sent when someone signs up with an email that already has a verified account
  z.object({type: z.literal('account-exists'), to, firstName: z.string(), signinUrl: z.url(), forgotPasswordUrl: z.url()}),
  // changedAt is set by the producer, so a mail that waited in the queue still shows when the change happened
  z.object({type: z.literal('password-changed'), to, firstName: z.string(), forgotPasswordUrl: z.url(), changedAt: z.iso.datetime()}),
])

export type EmailJob = z.infer<typeof emailJobModel>
