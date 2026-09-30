import express from 'express'
import type {Router} from 'express'
import { AuthController } from './controller.js';

export const authRouter: Router = express.Router()

const authController = new AuthController()

authRouter.post('/sign-up', authController.handleSignup.bind(authController))
authRouter.post('/sign-in', authController.handleSignin.bind(authController))
