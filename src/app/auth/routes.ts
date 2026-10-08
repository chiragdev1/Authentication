import express from 'express'
import type {Router} from 'express'
import { AuthController } from './controller.js';
import { authenticateToken } from './middleware.js';

export const authRouter: Router = express.Router()

const authController = new AuthController()

authRouter.post('/sign-up', authController.handleSignup.bind(authController))
authRouter.post('/sign-in', authController.handleSignin.bind(authController))
authRouter.post('/logout', authController.handleLogout.bind(authController))
// no auth: the frontend posts the token from the email link, and the token itself identifies the user
authRouter.post('/verify-email/:token', authController.handleVerifyEmail.bind(authController))
authRouter.post('/refresh', authController.handleRefresh.bind(authController))
authRouter.get('/me', authenticateToken, authController.handleMe.bind(authController))
authRouter.post('/forgot-password', authController.handleForgotPassword.bind(authController))
authRouter.post('/reset-password/:token', authController.handleResetPassword.bind(authController))
authRouter.post('/change-password' , authenticateToken, authController.handleChangePassword.bind(authController))
