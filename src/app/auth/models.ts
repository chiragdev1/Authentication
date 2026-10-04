import {z} from 'zod'

export const signupPayloadModel = z.object({
  firstName: z.string().min(2),
  lastName: z.string().nullable().optional(),
  age: z.number().int().positive().optional(),
  email: z.email(),
  password: z.string().min(6).max(72)
})

export const signinPayloadModel = z.object({
  email: z.email(),
  password: z.string().min(6)
})

export const verifyEmailPayloadModel = z.object({
  token: z.string().min(1).max(100)
})