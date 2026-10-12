import express from 'express'
import type {Router} from 'express'
import { InternalController } from './controller.js';

export const internalRouter: Router = express.Router()

const internalController = new InternalController()

internalRouter.post('/authenticate', internalController.handleAuthenticate.bind(internalController))
internalRouter.put('/users/:id/avatar', internalController.handleSetAvatar.bind(internalController))
