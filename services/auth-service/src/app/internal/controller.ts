import type {Request, Response} from 'express'
import { eq } from 'drizzle-orm';

import { ApiError } from '@authentication/shared/api-error'
import { ApiResponse } from '@authentication/shared/api-response'
import { parseOrThrow } from '@authentication/shared/parse-or-throw'
import { db } from '../../db/index.js';
import { usersTable } from '../../db/schema.js';
import { internalAuthenticatePayloadModel, setAvatarPayloadModel } from '../auth/models.js';
import { findSessionUser } from '../auth/middleware.js';

// endpoints for other services. the internal key check in front of them is the only caller check, so they trust their input's origin
// but still validate its shape
export class InternalController {

  // media-service sends the access token from the user's cookie; the answer is the same as authenticateToken's (401, 403 or the user)
  public async handleAuthenticate(req: Request, res: Response) {
    const {accessToken} = await parseOrThrow(internalAuthenticatePayloadModel, req.body)

    const {user, sessionId} = await findSessionUser(accessToken)

    return ApiResponse.ok(res, 'Session is valid', {user, sessionId})
  }

  // the image is already on ImageKit. this only swaps the pointer and hands back the old file, which the caller deletes;
  // the network calls stay in media-service, outside this transaction
  public async handleSetAvatar(req: Request, res: Response) {
    const {id, url, fileId} = await parseOrThrow(setAvatarPayloadModel, {...req.body, id: req.params.id})

    // lock the row so two uploads at the same time can't both read the same old avatar and leave one file orphaned
    const previousFileId = await db.transaction(async (tx) => {
      const [userInDb] = await tx.select({avatarFileId: usersTable.avatarFileId}).from(usersTable).where(eq(usersTable.id, id)).for('update')

      if(!userInDb) {
        throw ApiError.notFound('User not found')
      }

      const [updated] = await tx.update(usersTable).set({avatarUrl: url, avatarFileId: fileId}).where(eq(usersTable.id, id)).returning({id: usersTable.id})

      if(!updated) {
        throw ApiError.internal('Could not update avatar')
      }

      return userInDb.avatarFileId
    })

    return ApiResponse.ok(res, 'Avatar updated', {previousFileId})
  }
}
