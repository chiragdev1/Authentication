import express from 'express'
import type {Router} from 'express'
import { AuthController } from './controller.js';
import { authenticateToken } from './middleware.js';
import { uploadAvatar } from '../middlewares/upload-multer.js';
import { rateLimits } from '../middlewares/rate-limit.js';

export const authRouter: Router = express.Router()

const authController = new AuthController()

authRouter.post('/sign-up', rateLimits.signupPerIp, authController.handleSignup.bind(authController))
authRouter.post('/sign-in', rateLimits.signinPerIp, rateLimits.signinPerEmail, authController.handleSignin.bind(authController))
authRouter.post('/logout', authController.handleLogout.bind(authController))
authRouter.post('/logout-all', authenticateToken, authController.handleLogoutAll.bind(authController))
// no auth: the frontend posts the token from the email link, and the token itself identifies the user
authRouter.post('/verify-email/:token', rateLimits.verifyEmailPerIp, authController.handleVerifyEmail.bind(authController))
authRouter.post('/refresh', rateLimits.refreshPerIp, authController.handleRefresh.bind(authController))
authRouter.get('/me', authenticateToken, authController.handleMe.bind(authController))
authRouter.get('/sessions', authenticateToken, authController.handleListSessions.bind(authController))
authRouter.delete('/sessions/:id', authenticateToken, authController.handleRevokeSession.bind(authController))
authRouter.post('/forgot-password', rateLimits.forgotPasswordPerIp, rateLimits.forgotPasswordPerEmail, authController.handleForgotPassword.bind(authController))
authRouter.post('/reset-password/:token', rateLimits.resetPasswordPerIp, authController.handleResetPassword.bind(authController))
// per-user limits run after authentication, so they key on the signed in user
authRouter.post('/change-password', authenticateToken, rateLimits.changePasswordPerUser, authController.handleChangePassword.bind(authController))
authRouter.post('/upload-avatar', authenticateToken, rateLimits.uploadAvatarPerUser, uploadAvatar, authController.handleUploadAvatar.bind(authController))
