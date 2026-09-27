import type {Request, Response} from 'express'
import crypto from 'node:crypto'

import { signupPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
export class AuthController {
  public async hangleSignup(req: Request, res: Response) {
    // validate values from req.body
    const validationResult = await signupPayloadModel.safeParseAsync(req.body)
    console.log('signupValidationResult' ,validationResult.error)

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
    console.log("password", password, "salt", salt, 'hashedPassword', hash)

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
}