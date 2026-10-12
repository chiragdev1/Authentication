import { Queue, type JobsOptions } from 'bullmq'
import { Redis } from 'ioredis'
import { EMAIL_QUEUE_NAME, type EmailJob } from '@authentication/shared/email-jobs'
import { env } from '../config/env.js'

// mail is sent by notification-service; these only put a job on its queue. the names and arguments are the ones the controller
// always used, so callers still treat them as fire-and-forget: sendX(...).catch(log)

// how long BullMQ keeps a job and how often it retries. the job carries the email address and, for verification and reset
// mails, a live token in the link, all readable by anything with access to Redis
const EMAIL_JOB_OPTIONS: JobsOptions = {
  // 15s, 30s, 1m, 2m between tries: the last one is about 4 minutes in, well inside the 15 minute life of the token in the link
  attempts: 5,
  backoff: {type: 'exponential', delay: 15_000},
  // kept no longer than the link is valid, so dev:last-link and debugging still work. removal by age is lazy (it runs when
  // another job finishes), which is only safe because the database, not Redis, decides when a token expires
  removeOnComplete: {age: 15 * 60},
  removeOnFail: {age: 15 * 60},
}

let emailQueue: Queue<EmailJob> | null = null

// created on first use, so importing this module (or a test that mocks it) never opens a Redis connection
function getEmailQueue() {
  if(!emailQueue) {
    // a producer should fail fast when Redis is down rather than buffer commands in memory; the caller logs the failure
    const connection = new Redis(env.REDIS_URL, {enableOfflineQueue: false, maxRetriesPerRequest: 1})
    connection.on('error', (error) => console.error('Email queue Redis error:', error.message))
    emailQueue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, {connection})
  }
  return emailQueue
}

async function enqueueEmail(job: EmailJob) {
  await getEmailQueue().add(job.type, job, EMAIL_JOB_OPTIONS)
}

export function sendEmailVerificationMail(to: string, verificationUrl: string) {
  return enqueueEmail({type: 'email-verification', to, verificationUrl})
}

export function sendWelcomeMail(to: string, firstName: string) {
  return enqueueEmail({type: 'welcome', to, firstName})
}

export function sendResetPasswordMail(to: string, firstName: string, resetUrl: string) {
  return enqueueEmail({type: 'reset-password', to, firstName, resetUrl})
}

// sent when someone signs up with an email that already has a verified account
export function sendAccountExistsMail(to: string, firstName: string, signinUrl: string, forgotPasswordUrl: string) {
  return enqueueEmail({type: 'account-exists', to, firstName, signinUrl, forgotPasswordUrl})
}

// sent after a password reset or change; it is the owner's only signal if someone else did it
export function sendPasswordChangedMail(to: string, firstName: string, forgotPasswordUrl: string) {
  return enqueueEmail({type: 'password-changed', to, firstName, forgotPasswordUrl, changedAt: new Date().toISOString()})
}
