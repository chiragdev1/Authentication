import type {Request, Response} from 'express'
import crypto from 'node:crypto'

import { signinPayloadModel, signupPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateAccessToken, generateRefreshToken } from './utils/jwt-token.js';
export class AuthController {
  public async handleSignup(req: Request, res: Response) {
    // validate values from req.body
    const validationResult = await signupPayloadModel.safeParseAsync(req.body)
    // console.log('signupValidationResult' ,validationResult.error)

    // if validation failed throw badRequest error
    if(!validationResult.success) {
      return res.status(400).json({message: validationResult.error.issues})
    }

    const {firstName, lastName, age, email, password} = validationResult.data

    // check if user with given email already exists
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email))

    // throw error if exists
    if(existingUser.length > 0) {
      return res.status(400).json({message: 'User already exists'})
    }

    // create a salt and hash the password with it
    const salt = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHmac('sha256', salt).update(password).digest('hex')

    // save the fields to the user
    const [result] = await db.insert(usersTable).values({
      firstName,
      lastName,
      age,
      email,
      password: hash,
      salt,
    }).returning({ id: usersTable.id })

    // throw error if user was not created in db
    if(!result) {
      return res.status(500).json({message: 'User could not be created'})
    }
    // return userid in response
    return res.status(201).json({message: 'User created successfully' , userId: result.id})
  }

  public async handleSignin(req: Request, res: Response) {
    // validate input fields(email, password)
    const validationResult = await signinPayloadModel.safeParseAsync(req.body)

    // throw error if validation failed(400 badRequest)
    if(!validationResult.success) {
      return res.status(400).json({success: false, message: "Invalid email or password"})
    }

    const {email, password} = validationResult.data

    // check if user with email exist in db
    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.email, email))
    // console.log('userInDb', userInDb)

    // throw error if user not found
    if(!userInDb) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist"
      })
    }

    // compare the passwords
    const hash = crypto.createHmac('sha256', userInDb.salt!).update(password).digest('hex')

    // throw error if password do not match(email or password is invalid)
    if(hash !== userInDb.password) {
      return res.status(403).json({message: "Invalid credentials"})
    }

    // generate and assign tokens 
    const accessToken = generateAccessToken({userId: userInDb.id})
    const refreshToken = generateRefreshToken({userId: userInDb.id})

    // save the refreshToken in db
    const [result] = await db.update(usersTable).set({refreshToken}).where(eq(usersTable.id, userInDb.id)).returning({id: usersTable.id})

    if(!result) {
      return res.status(500).json({success: false, message: 'Could not save refresh token'})
    }

    // save the tokens in cookies/response data object
    res.cookie('access_token', accessToken, {httpOnly: true, sameSite: 'none', secure: true})
    res.cookie('refresh_token', refreshToken, {httpOnly: true, sameSite: 'none', secure: true})

    // send the response
    return res.status(200).json({
      success: true,
      message: 'user logged in successfully',
      data: {userId: userInDb.id}
    })
  }
}