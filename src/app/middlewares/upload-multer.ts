import multer from 'multer'
import sharp from 'sharp'
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../../utils/api-error.js';

export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

const AVATAR_SIZE_PX = 512
// a small file can still decode to a huge bitmap; refuse anything over ~24 megapixels before it is held in memory
const AVATAR_MAX_INPUT_PIXELS = 24_000_000

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// memoryStorage keeps the file in req.file.buffer, so nothing is written to disk before it goes to ImageKit
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_FILE_SIZE,
    files: 1,
    fields: 0,
    parts: 1,
    fieldNameSize: 50,
  },
  fileFilter: (_req, file, callback) => {
    // the client controls this mimetype, so it is only an early reject; the real check is on the file bytes below
    if(!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(ApiError.badRequest('Only JPEG, PNG and WebP images are allowed'))
    }
    callback(null, true)
  },
}).single('avatar')

// multer error codes turned into messages the client can act on
const multerErrorMessages: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: `Avatar must be at most ${AVATAR_MAX_FILE_SIZE / (1024 * 1024)} MB`,
  LIMIT_FILE_COUNT: 'Only one file can be uploaded',
  LIMIT_UNEXPECTED_FILE: "Avatar must be sent in the 'avatar' field",
  LIMIT_PART_COUNT: "Only the 'avatar' file can be sent",
  LIMIT_FIELD_COUNT: "Only the 'avatar' file can be sent",
}

export function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  if(!req.is('multipart/form-data')) {
    return next(ApiError.badRequest('Request must be multipart/form-data'))
  }

  avatarUpload(req, res, (error: unknown) => {
    if(error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, multerErrorMessages.LIMIT_FILE_SIZE))
    }
    if(error instanceof multer.MulterError) {
      return next(ApiError.badRequest(multerErrorMessages[error.code] ?? `Invalid upload: ${error.message}`))
    }
    if(error) {
      return next(error)
    }

    if(!req.file) {
      return next(ApiError.badRequest("Avatar file is required in the 'avatar' field"))
    }

    // trust the file signature, not the client's mimetype or extension; this is the cheap check before decoding
    if(!detectImageType(req.file.buffer)) {
      return next(ApiError.badRequest('Only JPEG, PNG and WebP images are allowed'))
    }

    const file = req.file
    reencodeAvatar(file.buffer).then((buffer) => {
      file.buffer = buffer
      file.size = buffer.length
      file.mimetype = 'image/webp'
      res.locals.imageExtension = 'webp'
      next()
    }, () => {
      next(ApiError.badRequest('The image could not be read, please upload a valid JPEG, PNG or WebP file'))
    })
  })
}

// decoding and encoding again keeps only the pixels: metadata such as GPS location is dropped,
// and anything hidden after the image data (a polyglot file) doesn't survive
function reencodeAvatar(buffer: Buffer) {
  return sharp(buffer, {limitInputPixels: AVATAR_MAX_INPUT_PIXELS, failOn: 'error'})
    // apply the EXIF orientation before it is stripped, so phone photos aren't saved sideways
    .rotate()
    .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, {fit: 'cover'})
    .webp({quality: 85})
    .toBuffer()
}

function detectImageType(buffer: Buffer) {
  // JPEG: FF D8 FF
  if(buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {mimeType: 'image/jpeg', extension: 'jpg'}
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if(buffer.length >= 8 && pngSignature.every((byte, index) => buffer[index] === byte)) {
    return {mimeType: 'image/png', extension: 'png'}
  }

  // WebP: "RIFF" <size> "WEBP"
  if(buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return {mimeType: 'image/webp', extension: 'webp'}
  }

  return null
}
