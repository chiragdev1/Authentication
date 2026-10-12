import type {Request, Response} from 'express'
import crypto from 'crypto'

import { ApiError } from '@authentication/shared/api-error'
import { ApiResponse } from '@authentication/shared/api-response'
import { deleteImage, uploadImage } from './utils/imagekit.js'
import { setAvatar } from './utils/auth-client.js'
import { env } from './config/env.js'

export class AvatarController {

  public async handleUploadAvatar(req: Request, res: Response) {
    const userId = (req.user as any)?.id

    // the file is already parsed, checked and re-encoded by the uploadAvatar middleware
    const file = req.file
    const extension: string | undefined = res.locals.imageExtension

    if(!file || !extension) {
      throw ApiError.badRequest('Avatar file is required')
    }

    // upload to ImageKit first; the old avatar stays in place until auth-service points the user at the new one.
    // the file name is random so the public url doesn't expose the user's id; the tag still links the file to its user in the ImageKit dashboard
    const uploadedAvatar = await uploadImage(file.buffer, `${crypto.randomUUID()}.${extension}`, file.mimetype, env.IMAGEKIT_FOLDER, [`user:${userId}`])

    let previousFileId: string | null
    try {
      ({previousFileId} = await setAvatar(userId, uploadedAvatar))
    } catch (error) {
      // only a 4xx is a definite "not saved". after a timeout or a 5xx auth-service may still have saved it, and deleting the file
      // then would leave the user pointing at a missing image; an unused file in ImageKit is the cheaper mistake
      const definitelyNotSaved = error instanceof ApiError && error.statusCode < 500
      if(definitelyNotSaved) {
        deleteImage(uploadedAvatar.fileId).catch((deleteError) => {
          console.error(`Failed to delete unused avatar ${uploadedAvatar.fileId} from ImageKit:`, deleteError)
        })
      } else {
        console.error(`Avatar ${uploadedAvatar.fileId} for user ${userId} may be unused: auth-service did not confirm the update`)
      }
      throw error
    }

    // the new avatar is saved, so a failure to delete the old one shouldn't fail the upload
    if(previousFileId) {
      deleteImage(previousFileId).catch((error) => {
        console.error(`Failed to delete old avatar ${previousFileId} from ImageKit:`, error)
      })
    }

    return ApiResponse.ok(res, 'Avatar uploaded successfully', {avatarUrl: uploadedAvatar.url})
  }
}
