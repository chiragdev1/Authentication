import type {Request, Response} from 'express'
import crypto from 'crypto'

import { changePasswordPayloadModel, forgotPasswordPayloadModel, resetPasswordPayloadModel, sessionIdParamsModel, signinPayloadModel, signupPayloadModel, verifyEmailPayloadModel } from './models.js';
import { db } from '../../db/index.js';
import { sessionsTable, usersTable } from '../../db/schema.js';
import { and, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { verifyAccessToken, verifyRefreshToken } from './utils/jwt-token.js';
import { ApiError } from '@authentication/shared/api-error';
import { ApiResponse } from '@authentication/shared/api-response';
import { ACCOUNT_EXISTS_MAIL_COOLDOWN_MS, COOKIE_NAMES, getFrontendUrl, RESET_PASSWORD_MAIL_COOLDOWN_MS, TEMP_TOKEN_TTL_MS } from './utils/constants.js';
import { clearAuthCookies, createSession, hashToken, revokeAllSessions, revokeSession, revokeSessionByRefreshToken, rotateSession, setAuthCookies } from './utils/session.js';
import { sendAccountExistsMail, sendEmailVerificationMail, sendPasswordChangedMail, sendResetPasswordMail, sendWelcomeMail } from '../../utils/mail.js';
import { hashPassword, verifyDummyPassword, verifyPassword } from '../../utils/password.js';
import { isPasswordBreached } from '../../utils/breached-password.js';
import { parseOrThrow } from '@authentication/shared/parse-or-throw';

const BREACHED_PASSWORD_MESSAGE = 'This password has appeared in a known data breach, please choose a different one'

export class AuthController {

  public async handleSignup(req: Request, res: Response) {
    const {firstName, lastName, age, email, password} = await parseOrThrow(signupPayloadModel, req.body)

    // same response whether or not the email is already registered, so this endpoint can't be used to check which emails have accounts;
    // the difference is only explained in the mail, which only the owner of the email can read
    const genericMessage = 'Check your email to finish creating your account'

    // checked before the email lookup, so the result says nothing about whether the account exists
    if(await isPasswordBreached(password)) {
      throw ApiError.badRequest(BREACHED_PASSWORD_MESSAGE)
    }

    // hash the password before checking the email, so both cases take about the same time
    const hash = await hashPassword(password)

    const {token: emailVerificationToken, hashedToken: hashedEmailVerificationToken} = createTempToken()
    const emailVerificationTokenExpiry = new Date(Date.now() + TEMP_TOKEN_TTL_MS)
    const verificationUrl = `${getFrontendUrl()}/verify-email?token=${emailVerificationToken}`

    // the unique email constraint decides if the account is new, so two signups at once can't both create it
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

    // new account: send the verification mail; the user can get a new one by signing up or signing in again if this fails
    if(result) {
      sendEmailVerificationMail(email, verificationUrl).catch((error) => {
        console.error(`Failed to send verification mail to user ${result.id}:`, error)
      })
      return ApiResponse.created(res, genericMessage)
    }

    // no row returned means the email is already registered
    const now = new Date()

    // not verified yet: whoever controls the inbox hasn't claimed it, so the latest signup replaces the details and gets a new link.
    // only once the last link has expired, so a signup can't swap the password under a link that is still in the owner's inbox.
    // unverified accounts never get a session, so there are none to revoke here
    const [unverifiedUser] = await db.update(usersTable).set({
      firstName,
      lastName: lastName ?? null,
      age: age ?? null,
      password: hash,
      emailVerificationToken: hashedEmailVerificationToken,
      emailVerificationTokenExpiry,
    })
    .where(and(
      eq(usersTable.email, email),
      eq(usersTable.emailVerified, false),
      or(isNull(usersTable.emailVerificationTokenExpiry), lt(usersTable.emailVerificationTokenExpiry, now))
    ))
    .returning({id: usersTable.id})

    if(unverifiedUser) {
      sendEmailVerificationMail(email, verificationUrl).catch((error) => {
        console.error(`Failed to send verification mail to user ${unverifiedUser.id}:`, error)
      })
      return ApiResponse.created(res, genericMessage)
    }

    // verified: tell the owner someone tried to sign up with their email, at most once every 15 minutes so the inbox can't be flooded.
    // the check and the update are one query, so parallel signups can't both send the mail
    const accountExistsMailCooldown = new Date(now.getTime() - ACCOUNT_EXISTS_MAIL_COOLDOWN_MS)

    const [verifiedUser] = await db.update(usersTable).set({accountExistsMailSentAt: now})
    .where(and(
      eq(usersTable.email, email),
      eq(usersTable.emailVerified, true),
      or(isNull(usersTable.accountExistsMailSentAt), lt(usersTable.accountExistsMailSentAt, accountExistsMailCooldown))
    ))
    .returning({id: usersTable.id, firstName: usersTable.firstName})

    if(verifiedUser) {
      sendAccountExistsMail(email, verifiedUser.firstName, `${getFrontendUrl()}/sign-in`, `${getFrontendUrl()}/forgot-password`).catch((error) => {
        console.error(`Failed to send account exists mail to user ${verifiedUser.id}:`, error)
      })
    }

    // any other case (unverified with a link still valid, or a mail sent recently) sends nothing, but the response is the same
    return ApiResponse.created(res, genericMessage)
  }

  public async handleSignin(req: Request, res: Response) {
    const {email, password} = await parseOrThrow(signinPayloadModel, req.body)

    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.email, email))

    // still run a bcrypt compare when there is no account, otherwise the faster response would reveal that the email isn't registered
    if(!userInDb || !userInDb.password) {
      await verifyDummyPassword(password)
      throw ApiError.unauthorized('Invalid email or password')
    }

    const {valid: isPasswordValid, needsRehash} = await verifyPassword(password, userInDb.password)

    if(!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password')
    }

    // no session until the email is verified, so nobody can get into an account before the inbox owner has claimed it
    if(!userInDb.emailVerified) {
      const {token: emailVerificationToken, hashedToken: hashedEmailVerificationToken} = createTempToken()
      const emailVerificationTokenExpiry = new Date(Date.now() + TEMP_TOKEN_TTL_MS)

      // send a new link only if the last one has expired, so signing in repeatedly doesn't send a new mail every time;
      // the check and the update are one query, so parallel sign ins can't both send it
      const [linkRenewed] = await db.update(usersTable).set({emailVerificationToken: hashedEmailVerificationToken, emailVerificationTokenExpiry})
      .where(and(
        eq(usersTable.id, userInDb.id),
        or(isNull(usersTable.emailVerificationTokenExpiry), lt(usersTable.emailVerificationTokenExpiry, new Date()))
      ))
      .returning({id: usersTable.id})

      // a mail failure shouldn't change the response
      if(linkRenewed) {
        const verificationUrl = `${getFrontendUrl()}/verify-email?token=${emailVerificationToken}`
        sendEmailVerificationMail(userInDb.email, verificationUrl).catch((error) => {
          console.error(`Failed to send verification mail to user ${userInDb.id}:`, error)
        })
      }

      throw ApiError.forbidden('Please verify your email before signing in, check your inbox for the verification link')
    }

    // the plain password is only available here, so this is when hashes made with an older, cheaper cost get upgraded.
    // matching on the old hash means a password change in the meantime isn't overwritten
    if(needsRehash) {
      await db.update(usersTable).set({password: await hashPassword(password)})
        .where(and(eq(usersTable.id, userInDb.id), eq(usersTable.password, userInDb.password)))
    }

    const tokens = await createSession(userInDb.id, req)
    setAuthCookies(res, tokens)

    return ApiResponse.ok(res, 'User signed in successfully', {id: userInDb.id})
  }

  public async handleVerifyEmail(req: Request, res: Response) {
    // the token comes last so a token field in the body can't replace the one from the url
    const {token, password} = await parseOrThrow(verifyEmailPayloadModel, {...req.body, token: req.params.token})
    const hashedToken = hashToken(token)

    const [userInDb] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, hashedToken))

    const isTokenValid = userInDb && userInDb.emailVerificationTokenExpiry && userInDb.emailVerificationTokenExpiry > new Date()

    if(!userInDb || !isTokenValid) {
      throw ApiError.notFound('Invalid or expired email token')
    }

    // the link only proves the inbox; the password proves this is the same person who signed up,
    // so someone who signed up with another person's email can't get the account verified with their own password
    const isPasswordValid = userInDb.password ? (await verifyPassword(password, userInDb.password)).valid : false

    if(!isPasswordValid) {
      // cancel the link, so the inbox owner can sign up again straight away and replace the details instead of waiting for it to expire
      await db.update(usersTable).set({emailVerificationToken: null, emailVerificationTokenExpiry: null}).where(and(eq(usersTable.id, userInDb.id), eq(usersTable.emailVerificationToken, hashedToken)))
      throw ApiError.unauthorized('Incorrect password, this verification link has been cancelled. Sign up again or sign in to get a new link')
    }

    // matching on the token means a signup that replaced the details in the meantime (and so the password just checked) makes this update do nothing
    const [updateRes] = await db
      .update(usersTable)
      .set({emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null})
      .where(and(eq(usersTable.id, userInDb.id), eq(usersTable.emailVerificationToken, hashedToken)))
      .returning({id: usersTable.id})

    // no row returned means the token was used or replaced since it was read
    if(!updateRes) {
      throw ApiError.notFound('Invalid or expired email token')
    }

    sendWelcomeMail(userInDb.email, userInDb.firstName).catch((error) => {
      console.error(`Failed to send welcome mail to user ${userInDb.id}:`, error)
    })

    return ApiResponse.ok(res, 'Email verified successfully')
  }

  public async handleLogout(req: Request, res: Response) {
    // no auth middleware here, so logout still works after the access token has expired
    const refreshToken: string | undefined = req.cookies?.[COOKIE_NAMES.refresh]
    const accessToken: string | undefined = req.cookies?.[COOKIE_NAMES.access]

    // matching on the token hash means only the holder of this token can end this session
    if(refreshToken) {
      await revokeSessionByRefreshToken(refreshToken)
    } else if(accessToken) {
      // without the refresh cookie, a still valid access token names the session instead
      const claims = (() => {
        try { return verifyAccessToken(accessToken) } catch { return null }
      })()
      if(claims) {
        await revokeSession(claims.sid, claims.userId)
      }
    }

    clearAuthCookies(res)

    return ApiResponse.ok(res, 'User logged out successfully')
  }

  public async handleLogoutAll(req: Request, res: Response) {
    const userId = (req.user as any)?.id

    await revokeAllSessions(userId)
    clearAuthCookies(res)

    return ApiResponse.ok(res, 'Signed out of all devices')
  }

  public async handleListSessions(req: Request, res: Response) {
    const userId = (req.user as any)?.id

    const sessions = await db.select({
      id: sessionsTable.id,
      userAgent: sessionsTable.userAgent,
      ip: sessionsTable.ip,
      createdAt: sessionsTable.createdAt,
      lastUsedAt: sessionsTable.lastUsedAt,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt), gt(sessionsTable.expiresAt, new Date())))
    .orderBy(desc(sessionsTable.lastUsedAt))

    return ApiResponse.ok(res, 'Sessions fetched successfully', sessions.map(session => ({...session, current: session.id === req.sessionId})))
  }

  public async handleRevokeSession(req: Request, res: Response) {
    const userId = (req.user as any)?.id
    const {id} = await parseOrThrow(sessionIdParamsModel, req.params)

    // matching on the user means one user can't end another user's session by guessing its id
    const revoked = await revokeSession(id, userId)

    if(!revoked) {
      throw ApiError.notFound('Session not found')
    }

    if(id === req.sessionId) {
      clearAuthCookies(res)
    }

    return ApiResponse.ok(res, 'Session revoked successfully')
  }

  public async handleMe(req: Request, res: Response) {
    // the user is already authenticated via authenticate middleware
    const safeUser = req.user as any

    return ApiResponse.ok(res, 'User details fetched successfully', safeUser)
  }

  public async handleRefresh(req: Request, res: Response) {
    const refreshToken: string | undefined = req.cookies?.[COOKIE_NAMES.refresh]

    if(!refreshToken) {
      throw ApiError.unauthorized("Refresh token not provided")
    }

    const claims = verifyRefreshToken(refreshToken)

    const [userInDb] = await db.select({id: usersTable.id, emailVerified: usersTable.emailVerified}).from(usersTable).where(eq(usersTable.id, claims.userId))

    if(!userInDb) {
      throw ApiError.unauthorized("Invalid or expired refresh token")
    }

    if(!userInDb.emailVerified) {
      throw ApiError.forbidden("Please verify your email before signing in")
    }

    // a failed rotation doesn't clear the cookies: when two tabs race, the winner's new cookie is already in the browser
    const tokens = await rotateSession(claims, refreshToken)
    setAuthCookies(res, tokens)

    return ApiResponse.ok(res, 'Refresh token validated successfully', {id: userInDb.id})
  }

  public async handleForgotPassword(req: Request, res: Response) {
    const {email} = await parseOrThrow(forgotPasswordPayloadModel, req.body)

    // the lookup, token write and mail run after the response is sent, so the response time is the same whether or not the account exists
    issueResetPasswordLink(email).catch((error) => {
      console.error('Failed to issue reset password link:', error)
    })

    return ApiResponse.ok(res, 'If an account with this email exists, a reset password email has been sent')
  }

  public async handleResetPassword(req: Request, res: Response) {
    const {token, newPassword} = await parseOrThrow(resetPasswordPayloadModel, {...req.body, token: req.params.token})
    const hashedToken = hashToken(token)

    // a cheap check first, so an invalid link doesn't cost a breach lookup and a bcrypt hash
    const [userInDb] = await db.select({id: usersTable.id}).from(usersTable)
      .where(and(eq(usersTable.resetPasswordToken, hashedToken), gt(usersTable.resetPasswordTokenExpiry, new Date())))

    if(!userInDb) {
      throw ApiError.notFound('Invalid or expired reset password token')
    }

    if(await isPasswordBreached(newPassword)) {
      throw ApiError.badRequest(BREACHED_PASSWORD_MESSAGE)
    }

    const hashedNewPassword = await hashPassword(newPassword)

    // the update matches on the token again, so two resets with the same link can't both succeed.
    // the link proves the inbox, so it also verifies the email; every session is ended because the old password may be known to someone else
    const updatedUser = await db.transaction(async (tx) => {
      const [updated] = await tx.update(usersTable).set({
        password: hashedNewPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      })
      .where(and(eq(usersTable.resetPasswordToken, hashedToken), gt(usersTable.resetPasswordTokenExpiry, new Date())))
      .returning({id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName})

      if(!updated) {
        throw ApiError.notFound('Invalid or expired reset password token')
      }

      await revokeAllSessions(updated.id, {}, tx)
      return updated
    })

    sendPasswordChangedMail(updatedUser.email, updatedUser.firstName, `${getFrontendUrl()}/forgot-password`).catch((error) => {
      console.error(`Failed to send password changed mail to user ${updatedUser.id}:`, error)
    })

    return ApiResponse.ok(res, 'Password reset successfully', {id: updatedUser.id})
  }

  public async handleChangePassword(req: Request, res: Response) {
    const userId = (req.user as any)?.id

    const {currentPassword, newPassword} = await parseOrThrow(changePasswordPayloadModel, req.body)

    const [userInDb] = await db.select({id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, password: usersTable.password}).from(usersTable).where(eq(usersTable.id, userId))

    if(!userInDb || !userInDb.password) {
      throw ApiError.unauthorized('User not found')
    }

    const {valid: isPasswordValid} = await verifyPassword(currentPassword, userInDb.password)

    if(!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect')
    }

    if(await isPasswordBreached(newPassword)) {
      throw ApiError.badRequest(BREACHED_PASSWORD_MESSAGE)
    }

    const hashedNewPassword = await hashPassword(newPassword)
    const oldPasswordHash = userInDb.password

    // matching on the old hash means two changes at once can't both pass the current password check and overwrite each other.
    // other devices are signed out; this session stays, and its tokens are still valid because the session is
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(usersTable).set({password: hashedNewPassword})
        .where(and(eq(usersTable.id, userId), eq(usersTable.password, oldPasswordHash)))
        .returning({id: usersTable.id})

      if(!updated) {
        throw ApiError.conflict('The password was changed by another request, please try again')
      }

      await revokeAllSessions(userId, {except: req.sessionId}, tx)
    })

    sendPasswordChangedMail(userInDb.email, userInDb.firstName, `${getFrontendUrl()}/forgot-password`).catch((error) => {
      console.error(`Failed to send password changed mail to user ${userInDb.id}:`, error)
    })

    return ApiResponse.ok(res, 'Password changed successfully', {id: userInDb.id})
  }

}

function createTempToken() {
  const token = crypto.randomBytes(32).toString('hex')
  return {token, hashedToken: hashToken(token)}
}

// a new link is issued at most once every 2 minutes; the cooldown check and the token write are one query,
// so parallel requests can't both send a mail. an unknown email simply matches no row
async function issueResetPasswordLink(email: string) {
  const {token, hashedToken} = createTempToken()
  const now = new Date()
  const cooldown = new Date(now.getTime() - RESET_PASSWORD_MAIL_COOLDOWN_MS)

  const [userInDb] = await db.update(usersTable).set({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpiry: new Date(now.getTime() + TEMP_TOKEN_TTL_MS),
    resetPasswordMailSentAt: now,
  })
  .where(and(
    eq(usersTable.email, email),
    or(isNull(usersTable.resetPasswordMailSentAt), lt(usersTable.resetPasswordMailSentAt, cooldown))
  ))
  .returning({id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName})

  if(!userInDb) {
    return
  }

  const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`

  sendResetPasswordMail(userInDb.email, userInDb.firstName, resetUrl).catch((error) => {
    console.error(`Failed to send reset password mail to user ${userInDb.id}:`, error)
  })
}
