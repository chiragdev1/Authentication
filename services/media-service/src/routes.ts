import express from 'express'
import type {Router} from 'express'
import { AvatarController } from './controller.js'
import { authenticateToken } from './middlewares/authenticate.js'
import { uploadAvatar } from './middlewares/upload-multer.js'
import { rateLimits } from './middlewares/rate-limit.js'

export const mediaRouter: Router = express.Router()

const avatarController = new AvatarController()

// the public path is unchanged from the monolith; the gateway sends it here instead of to auth-service.
// authenticate before multer reads the body, so an anonymous caller can't make the service buffer a file
mediaRouter.post('/auth/upload-avatar', authenticateToken, rateLimits.uploadAvatarPerUser, uploadAvatar, avatarController.handleUploadAvatar.bind(avatarController))
