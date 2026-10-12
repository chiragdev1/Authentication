import {z} from 'zod'
import { BCRYPT_MAX_BYTES } from '../../utils/password.js'

// normalize before validating so " John@Gmail.com " and "john@gmail.com" map to the same account
// 254 is the max length of a valid email address (RFC 5321)
export const emailModel = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email('Invalid email address'))

// rules for choosing a password. the cap is in bytes because bcrypt ignores everything after 72 bytes,
// and an emoji is 4 bytes, so 72 characters can be far more than bcrypt reads
const newPasswordModel = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(password => Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES, `Password must be at most ${BCRYPT_MAX_BYTES} bytes`)

// for checking an existing password; only needs to be present, so passwords that predate the current rules still work
const existingPasswordModel = z.string().min(1).max(72)

// max lengths match the varchar(45) columns in the users table; age is capped well inside the integer column's range
export const signupPayloadModel = z.object({
  firstName: z.string().trim().min(2).max(45),
  lastName: z.string().trim().max(45).nullable().optional(),
  age: z.number().int().positive().max(150).optional(),
  email: emailModel,
  password: newPasswordModel
})

export const signinPayloadModel = z.object({
  email: emailModel,
  password: existingPasswordModel
})

// the password is checked on verify, so only the person who chose it at signup and also owns the inbox can verify the account
export const verifyEmailPayloadModel = z.object({
  token: z.string().min(1).max(100),
  password: existingPasswordModel
})

export const reqUserModel = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  age: z.number().int().positive().optional().nullable(),
  email: z.email(),
  emailVerified: z.boolean(),
  avatarUrl: z.string().nullable()
})

export const forgotPasswordPayloadModel = z.object({
  email: emailModel
})

// the token comes from req.params and the new password from req.body
export const resetPasswordPayloadModel = z.object({
  token: z.string().min(1).max(100),
  newPassword: newPasswordModel
})

export const changePasswordPayloadModel = z.object({
  currentPassword: existingPasswordModel,
  newPassword: newPasswordModel
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from the current password',
  path: ['newPassword']
})

export const sessionIdParamsModel = z.object({
  id: z.uuid('Invalid session id')
})
