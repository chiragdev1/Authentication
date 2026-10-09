import type {Request, Response} from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import { changePasswordPayloadModel, forgotPasswordPayloadModel, resetPasswordPayloadModel, signinPayloadModel, signupPayloadModel, verifyEmailPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken, getTokenExpiry, verifyRefreshToken } from './utils/jwt-token.js';
import { ApiError } from '../../utils/api-error.js';
import { ApiResponse } from '../../utils/api-response.js';
import { cookieOptions, getFrontendUrl } from './utils/constants.js';
import { sendEmailVerificationMail, sendResetPasswordMail, sendWelcomeMail } from '../../utils/mail.js';
import { deleteImage, uploadImage } from '../../utils/imagekit.js';

export class AuthController {

  public async handleSignup(req: Request, res: Response) {

    // validate values from req.body
    const validationResult = await signupPayloadModel.safeParseAsync(req.body)

    // if validation failed throw badRequest error
    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    const {firstName, lastName, age, email, password} = validationResult.data

    // check if user with given email already exists
    // const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email))

    // throw error if exists
    // if(existingUser.length > 0) {
    //   throw ApiError.conflict('User with this email already exists')
    // }
    // hash the password
    const hash = await bcrypt.hash(password, 10)

    // generate email verification token and url
    // const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    // const hashedEmailVerificationToken = await bcrypt.hash(emailVerificationToken, 12)

    const {token: emailVerificationToken, hashedToken: hashedEmailVerificationToken} = await createTempToken()
    const emailVerificationTokenExpiry = new Date(Date.now() + (15*60*1000)) // 15 minutes from now

    // save the fields to the user
    const [result] = await db.insert(usersTable).values({
      firstName,
      lastName,
      age,
      email,
      password: hash,
      emailVerificationToken: hashedEmailVerificationToken,
      emailVerificationTokenExpiry
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id })

    // no row returned means another request created this email in the meantime
    if(!result) {
      throw ApiError.conflict('User with this email already exists')
    }

    // send email verification email to user with the token; the user can get a new one by signing in if this fails
    const verificationUrl = `${getFrontendUrl()}/verify-email?token=${emailVerificationToken}`
    sendEmailVerificationMail(email, verificationUrl).catch((error) => {
      console.error(`Failed to send verification mail to ${email}:`, error)
    })

    // return userid in response
    return ApiResponse.created(res, 'User created successfully', {id: result.id})
  }

  public async handleSignin(req: Request, res: Response) {
    // validate input fields(email, password)
    const validationResult = await signinPayloadModel.safeParseAsync(req.body)

    // throw error if validation failed(400 badRequest)
    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    const {email, password} = validationResult.data

    // check if user with email exist in db
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.email, email))
    // console.log('userInDb', userInDb)

    // throw error if user not found
    if(!userInDb || !userInDb.password) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    // compare the passwords
    const isPasswordValid = await bcrypt.compare(password, userInDb.password)

    // throw error if password do not match(email or password is invalid)
    if(!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    // generate and assign tokens 
    const accessToken = generateAccessToken({userId: userInDb.id})
    const refreshToken = generateRefreshToken({userId: userInDb.id})

    // hash the refreshToken before saving it in db
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex')

    // resend the verification mail only if the email is not verified and the last link has expired,
    // so signing in repeatedly doesn't send a new mail every time
    const hasValidVerificationToken = userInDb.emailVerificationTokenExpiry && userInDb.emailVerificationTokenExpiry > new Date()
    const shouldSendVerificationMail = !userInDb.emailVerified && !hasValidVerificationToken

    const {token: emailVerificationToken, hashedToken: hashedEmailVerificationToken} = await createTempToken()
    const emailVerificationTokenExpiry = new Date(Date.now() + (15*60*1000)) // 15 minutes from now

    // save the hashed refreshToken (and the new emailVerificationToken if needed) in db
    const [result] = await db.update(usersTable).set({
      refreshToken: hashedRefreshToken,
      ...(shouldSendVerificationMail && {emailVerificationToken: hashedEmailVerificationToken, emailVerificationTokenExpiry})
    }).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    if(!result) {
      throw ApiError.internal('Could not save refresh token in db')
    }

    // a mail failure shouldn't fail sign in
    if(shouldSendVerificationMail) {
      const verificationUrl = `${getFrontendUrl()}/verify-email?token=${emailVerificationToken}`
      sendEmailVerificationMail(userInDb.email, verificationUrl).catch((error) => {
        console.error(`Failed to send verification mail to ${userInDb.email}:`, error)
      })
    }

    // save the tokens in cookies/response data object
    res.cookie('access_token', accessToken, {...cookieOptions, expires: getTokenExpiry(accessToken)})
    res.cookie('refresh_token', refreshToken, {...cookieOptions, expires: getTokenExpiry(refreshToken)})

    // send the response
    return ApiResponse.ok(res, 'User signed in successfully', {id: userInDb.id})
  }

  public async handleVerifyEmail(req: Request, res: Response) {

    // validate the token from req.params
    const validationResult = await verifyEmailPayloadModel.safeParseAsync(req.params)

    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    const {token} =  validationResult.data
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // search the db for the user with the token and check if it is valid and not expired
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, hashedToken))

    const isTokenValid = userInDb && userInDb.emailVerificationTokenExpiry && userInDb.emailVerificationTokenExpiry > new Date()

    if(!userInDb || !isTokenValid) {
      throw ApiError.notFound('Invalid or expired email token')
    }

    // update the emailVerified field to true and remove the emailVerificationToken and emailVerificationTokenExpiry fields from the user record
    const [updateRes] = await db
      .update(usersTable)
      .set({emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null})
      .where(eq(usersTable.id, userInDb.id))
      .returning({id: usersTable.id})

    // if no row returned, the update failed
    if(!updateRes) {
      throw ApiError.internal('Could not update user record to mark email as verified')
    }

    // send welcome mail now that signup is complete; a mail failure shouldn't fail verification
    sendWelcomeMail(userInDb.email, userInDb.firstName).catch((error) => {
      console.error(`Failed to send welcome mail to ${userInDb.email}:`, error)
    })

    return ApiResponse.ok(res, 'Email verified successfully')
  }

  public async handleLogout(req: Request, res: Response) {
    // no auth middleware here, so logout still works after the access token has expired
    const refreshToken = req.cookies?.refresh_token

    // revoke the refreshToken in db; matching on the hash means only the owner of this token can revoke it
    if(refreshToken) {
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
      await db.update(usersTable).set({refreshToken: null}).where(eq(usersTable.refreshToken, hashedRefreshToken))
    }

    // always clear both accessToken and refreshToken cookies
    res.clearCookie('access_token', cookieOptions)
    res.clearCookie('refresh_token', cookieOptions)

    // send response
    return ApiResponse.ok(res, 'User logged out successfully')
  }

  public async handleMe(req: Request, res: Response) {

    // the user is already authenticated via authenticate middleware
    const safeUser = req.user as any

    // send Response
    return ApiResponse.ok(res, 'User details fetched successfully', safeUser)
  }

  public async handleRefresh(req: Request, res: Response) {
    // get the tokens from the cookies
    const refreshToken = req.cookies?.refresh_token
    
    if(!refreshToken) {
      throw ApiError.unauthorized("Refresh token not provided")
    }

    // validate the refreshToken and extract the userId from it
    const {userId} = verifyRefreshToken(refreshToken)

    // hash the refreshToken before searching it in db
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex')

    // search the db for the hashed token
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.refreshToken, hashedRefreshToken))

    // for double checking check if the userId from the token matches the userId from the db
    if(!userInDb || userInDb.id !== userId) {
      throw ApiError.unauthorized("Invalid or expired refresh token")
    }

    // if refreshTOken match then generate new accessToken and refreshToken
    const newAccessToken = generateAccessToken({userId: userInDb.id})
    const newRefreshToken = generateRefreshToken({userId: userInDb.id})

    // hash the new refreshToken before saving it in db
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

    // save the new refreshToken in db
    const [result] = await db.update(usersTable).set({refreshToken: newHashedRefreshToken}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})
    
    // send error if the db update failed
    if(!result) {
      throw ApiError.internal("Could not update refresh token in db")
    }

    // set the tokens in cookies
    res.cookie('access_token', newAccessToken, {...cookieOptions, expires: getTokenExpiry(newAccessToken)})
    res.cookie('refresh_token', newRefreshToken, {...cookieOptions, expires: getTokenExpiry(newRefreshToken)})

    // send response
    return ApiResponse.ok(res, 'Refresh token validated successfully', {id: userInDb.id})
  }

  public async handleForgotPassword(req: Request, res: Response) {
    // validate the email in zod
    const validationResult = await forgotPasswordPayloadModel.safeParseAsync(req.body)

    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    const {email} = validationResult.data

    // search the db for email
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.email, email))

    // same response whether or not the user exists, so this endpoint can't be used to check which emails are registered
    const genericMessage = 'If an account with this email exists, a reset password email has been sent'

    if(!userInDb) {
      return ApiResponse.ok(res, genericMessage)
    }

    // generate a resetPasswordToken and save it in db with expiry
    const {token: resetPasswordToken, hashedToken: hashedResetPasswordToken} = await createTempToken()
    const resetPasswordTokenExpiry = new Date(Date.now() + (15*60*1000)) // 15 minutes from now

    // sve the resetPasswordToken and resetPasswordTokenExpiry in db
    const [result] = await db.update(usersTable).set({resetPasswordToken: hashedResetPasswordToken, resetPasswordTokenExpiry}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    // if no row returned, send 500 error
    if(!result) {
      throw ApiError.internal('Could not save reset password token in db')
    }

    // create the reset password url pointing at the frontend page
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetPasswordToken}`

    // send the reset password email without awaiting it, so a mail failure or the extra delay doesn't reveal that the user exists
    sendResetPasswordMail(userInDb.email, userInDb.firstName, resetUrl).catch((error) => {
      console.error(`Failed to send reset password mail to ${userInDb.email}:`, error)
    })

    // send response
    return ApiResponse.ok(res, genericMessage)
  }

  public async handleResetPassword(req: Request, res: Response) {
    // get the token from req.params
    const token = req.params.token

    // validate the token and newPassword in zod
    const validationResult = await resetPasswordPayloadModel.safeParseAsync({token, ...req.body})
    
    // if validation failed throw badRequest error
    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    // extract the token and newPassword from the validated data
    const {token: resetPasswordToken, newPassword} = validationResult.data

    // hash the token and search the db for the user with the hashed token
    const hashedToken = crypto.createHash('sha256').update(resetPasswordToken).digest('hex')

    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.resetPasswordToken, hashedToken))

    // if user not found or token expired, send 404 error
    const isTokenValid = userInDb && userInDb.resetPasswordTokenExpiry && userInDb.resetPasswordTokenExpiry > new Date()

    if(!userInDb || !isTokenValid) {
      throw ApiError.notFound('Invalid or expired reset password token')
    }

    // hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // if valid, update the password, remove the reset token fields, and clear the refreshToken so existing sessions are signed out
    const [result] = await db.update(usersTable).set({password: hashedNewPassword, resetPasswordToken: null, resetPasswordTokenExpiry: null, refreshToken: null}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    // if no row returned, send 500 error
    if(!result) {
      throw ApiError.internal('Could not update password in db')
    }

    // send response
    return ApiResponse.ok(res, 'Password reset successfully', {id: result?.id})
  }

  public async handleChangePassword(req: Request, res: Response) {
    // get the id from req.user
    const userId = (req.user as any)?.id

    // validate the currentPassword and newPassword in zod
    const validationResult = await changePasswordPayloadModel.safeParseAsync(req.body)

    if(!validationResult.success) {
      throw ApiError.badRequest(`Invalid input fields: ${validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`)
    }

    const {currentPassword, newPassword} = validationResult.data

    // search the db for user with id
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.id, userId))

    if(!userInDb || !userInDb.password) {
      throw ApiError.unauthorized('User not found')
    }

    // compare the currentPassword with the password in db
    const isPasswordValid = await bcrypt.compare(currentPassword, userInDb.password)

    if(!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect')
    }

    // hash the newPassword
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // rotate the refreshToken so sessions on other devices are signed out, while this one stays signed in
    const accessToken = generateAccessToken({userId: userInDb.id})
    const refreshToken = generateRefreshToken({userId: userInDb.id})
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex')

    // update the password and refreshToken in db
    const [result] = await db.update(usersTable).set({password: hashedNewPassword, refreshToken: hashedRefreshToken}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    if(!result) {
      throw ApiError.internal('Could not update password in db')
    }

    // set the new tokens in cookies
    res.cookie('access_token', accessToken, {...cookieOptions, expires: getTokenExpiry(accessToken)})
    res.cookie('refresh_token', refreshToken, {...cookieOptions, expires: getTokenExpiry(refreshToken)})

    // send response
    return ApiResponse.ok(res, 'Password changed successfully', {id: result.id})
  }

  public async handleUploadAvatar(req: Request, res: Response) {
    // get the id from req.user
    const userId = (req.user as any)?.id

    // the file is already parsed and its type checked by the uploadAvatar middleware
    const file = req.file
    const extension: string | undefined = res.locals.imageExtension

    if(!file || !extension) {
      throw ApiError.badRequest('Avatar file is required')
    }

    // upload to ImageKit first; the old avatar stays in place until the db points at the new one
    // the file name is random so the public url doesn't expose the user's id; the tag still links the file to its user in the ImageKit dashboard
    const uploadedAvatar = await uploadImage(file.buffer, `${crypto.randomUUID()}.${extension}`, file.mimetype, '/avatars', [`user:${userId}`])

    // lock the row so two uploads at the same time can't both read the same old avatar and leave one file orphaned
    let previousAvatarFileId: string | null
    try {
      previousAvatarFileId = await db.transaction(async (tx) => {
        const [userInDb] = await tx.select({avatarFileId: usersTable.avatarFileId}).from(usersTable).where(eq(usersTable.id, userId)).for('update')

        if(!userInDb) {
          throw ApiError.unauthorized('User not found')
        }

        await tx.update(usersTable).set({avatarUrl: uploadedAvatar.url, avatarFileId: uploadedAvatar.fileId}).where(eq(usersTable.id, userId))

        return userInDb.avatarFileId
      })
    } catch (error) {
      // the db was not updated, so remove the file we just uploaded instead of leaving it unused in ImageKit
      deleteImage(uploadedAvatar.fileId).catch((deleteError) => {
        console.error(`Failed to delete unused avatar ${uploadedAvatar.fileId} from ImageKit:`, deleteError)
      })
      throw error
    }

    // the new avatar is saved, so a failure to delete the old one shouldn't fail the upload
    if(previousAvatarFileId) {
      deleteImage(previousAvatarFileId).catch((error) => {
        console.error(`Failed to delete old avatar ${previousAvatarFileId} from ImageKit:`, error)
      })
    }

    // send response
    return ApiResponse.ok(res, 'Avatar uploaded successfully', {avatarUrl: uploadedAvatar.url})
  }

}

async function createTempToken() {
  
  const token = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  return {token, hashedToken}
}