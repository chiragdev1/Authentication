import type {z} from 'zod'
import {ApiError} from './api-error.js'

// every handler validates the same way, so the 400 message format lives in one place
export async function parseOrThrow<T extends z.ZodType>(model: T, data: unknown): Promise<z.output<T>> {
  const validationResult = await model.safeParseAsync(data)

  if(!validationResult.success) {
    throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
  }

  return validationResult.data
}
