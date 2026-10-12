// env is imported first, so a bad configuration stops the process before the worker connects
import { env } from './config/env.js'
import { createEmailWorker } from './worker.js'

const worker = createEmailWorker()
console.log(`notification-service is consuming the email queue in ${env.NODE_ENV} mode`)

// let the mails being sent finish before exiting; unfinished jobs go back to the queue for the next worker
async function shutdown(signal: string) {
  console.log(`${signal} received, closing the email worker`)
  await worker.close()
  process.exit(0)
}

process.on('SIGINT', () => { shutdown('SIGINT') })
process.on('SIGTERM', () => { shutdown('SIGTERM') })
