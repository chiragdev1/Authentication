import type {Request, Response} from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import { signinPayloadModel, signupPayloadModel, verifyEmailPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken, getTokenExpiry } from './utils/jwt-token.js';
import { ApiError } from '../../utils/api-error.js';
import { ApiResponse } from '../../utils/api-response.js';
import { cookieOptions } from './utils/constants.js';
import { sendEmailVerificationMail } from '../../utils/mail.js';

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

    // send email verification email to user with the token
    const verificationUrl = `http://localhost:8080/auth/verify-email/${emailVerificationToken}`
    const mailRes = await sendEmailVerificationMail(email, verificationUrl)

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

    const {token: emailVerificationToken, hashedToken: hashedEmailVerificationToken} = await createTempToken()
    const emailVerificationTokenExpiry = new Date(Date.now() + (15*60*1000)) // 15 minutes from now

    
    // save the refreshToken and emailVerificationToken in db
    const [result] = await db.update(usersTable).set({refreshToken, emailVerificationToken: hashedEmailVerificationToken, emailVerificationTokenExpiry}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})
    
    if(!result) {
      throw ApiError.internal('Could not save refresh token')
    }
    const mailRes = await sendEmailVerificationMail(userInDb.email, `http://localhost:8080/auth/verify-email/${emailVerificationToken}`)
    console.log('mailRes', mailRes)

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
    console.log('userInDb', userInDb)

    const isTokenValid = userInDb && userInDb.emailVerificationTokenExpiry && userInDb.emailVerificationTokenExpiry > new Date()

    if(!userInDb || !isTokenValid) {
      console.log('Invalid or expired email token', {userInDb, isTokenValid})
      throw ApiError.notFound('Invalid or expired email token')
    }

    // update the emailVerified field to true and remove the emailVerificationToken and emailVerificationTokenExpiry fields from the user record
    const updateRes = await db
      .update(usersTable)
      .set({emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null})
      .where(eq(usersTable.id, userInDb.id))

    // if valid, update the user record to mark email as verified and remove the token from db
    if(!updateRes) {
      throw ApiError.internal('Could not update user record to mark email as verified')
    }

    return ApiResponse.ok(res, 'Email verified successfully')
  }
}

async function createTempToken() {
  
  const token = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  return {token, hashedToken}
}