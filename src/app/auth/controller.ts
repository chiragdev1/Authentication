import type {Request, Response} from 'express'
import bcrypt from 'bcryptjs'

import { signinPayloadModel, signupPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken, getTokenExpiry } from './utils/jwt-token.js';
import { ApiError } from '../../utils/api-error.js';
import { ApiResponse } from '../../utils/api-response.js';
import { cookieOptions } from './utils/constants.js';

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
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email))

    // throw error if exists
    if(existingUser.length > 0) {
      throw ApiError.conflict('User with this email already exists')
    }
    // hash the password
    const hash = await bcrypt.hash(password, 10)

    // save the fields to the user
    const [result] = await db.insert(usersTable).values({
      firstName,
      lastName,
      age,
      email,
      password: hash,
    })
    .onConflictDoNothing({ target: usersTable.email })
    .returning({ id: usersTable.id })

    // no row returned means another request created this email in the meantime
    if(!result) {
      throw ApiError.conflict('User with this email already exists')
    }
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

    // save the refreshToken in db
    const [result] = await db.update(usersTable).set({refreshToken}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    if(!result) {
      throw ApiError.internal('Could not save refresh token')
    }

    // save the tokens in cookies/response data object
    res.cookie('access_token', accessToken, {...cookieOptions, expires: getTokenExpiry(accessToken)})
    res.cookie('refresh_token', refreshToken, {...cookieOptions, expires: getTokenExpiry(refreshToken)})

    // send the response
    return ApiResponse.ok(res, 'User signed in successfully')
  }
}