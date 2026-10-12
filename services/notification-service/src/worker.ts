import { UnrecoverableError, Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { EMAIL_QUEUE_NAME, emailJobModel } from '@authentication/shared/email-jobs'

import { env } from './config/env.js'
import { sendAccountExistsMail, sendEmailVerificationMail, sendPasswordChangedMail, sendResetPasswordMail, sendWelcomeMail } from './mail.js'

// a job that doesn't match the contract will never succeed, so it fails straight away instead of being retried
export async function processEmailJob(data: unknown) {
  const parsed = emailJobModel.safeParse(data)
  if(!parsed.success) {
    throw new UnrecoverableError(`Invalid email job: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`)
  }

  const job = parsed.data
  switch(job.type) {
    case 'email-verification':
      return sendEmailVerificationMail(job.to, job.verificationUrl)
    case 'welcome':
      return sendWelcomeMail(job.to, job.firstName)
    case 'reset-password':
      return sendResetPasswordMail(job.to, job.firstName, job.resetUrl)
    case 'account-exists':
      return sendAccountExistsMail(job.to, job.firstName, job.signinUrl, job.forgotPasswordUrl)
    case 'password-changed':
      return sendPasswordChangedMail(job.to, job.firstName, job.forgotPasswordUrl, new Date(job.changedAt))
  }
}

export function createEmailWorker() {
  // a worker blocks on Redis while it waits for jobs, which BullMQ requires maxRetriesPerRequest: null for
  const connection = new Redis(env.REDIS_URL, {maxRetriesPerRequest: null})

  const worker = new Worker(EMAIL_QUEUE_NAME, async (job: Job) => { await processEmailJob(job.data) }, {
    connection,
    concurrency: env.EMAIL_CONCURRENCY,
  })

  // the job id and type identify the mail; the address and links stay out of the logs
  worker.on('failed', (job, error) => {
    console.error(`Email job ${job?.id} (${job?.name}) failed on attempt ${job?.attemptsMade}:`, error.message)
  })
  worker.on('error', (error) => console.error('Email worker error:', error.message))

  return worker
}
