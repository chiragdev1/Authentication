import express from 'express'
import type {Router} from 'express'
import { AuthController } from './controller.js';
import { authenticateToken } from './middleware.js';

export const authRouter: Router = express.Router()

const authController = new AuthController()

authRouter.post('/sign-up', authController.handleSignup.bind(authController))
authRouter.post('/sign-in', authController.handleSignin.bind(authController))
authRouter.post('/verify-email/:token',authenticateToken, authController.handleVerifyEmail.bind(authController))
