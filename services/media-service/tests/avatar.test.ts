import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import sharp from 'sharp'
import { ApiError } from '@authentication/shared/api-error'

// auth-service and ImageKit are other systems; each mock records what this service asked of them
vi.mock('../src/utils/auth-client.js', () => ({
  authenticate: vi.fn(async () => ({user: {id: 'user-1'}, sessionId: 'session-1'})),
  setAvatar: vi.fn(async () => ({previousFileId: 'file_old'})),
}))
vi.mock('../src/utils/imagekit.js', () => ({
  uploadImage: vi.fn(async () => ({fileId: 'file_new', url: 'https://ik.example/avatars/new.webp'})),
  deleteImage: vi.fn(async () => {}),
}))

import { createExpressApplication } from '../src/app.js'
import { authenticate, setAvatar } from '../src/utils/auth-client.js'
import { deleteImage, uploadImage } from '../src/utils/imagekit.js'

const service = createExpressApplication()
const app = express().use((req, _res, next) => { req.headers['x-internal-key'] = process.env.INTERNAL_API_KEY; next() }, service)

const photo = await sharp({create: {width: 1200, height: 900, channels: 3, background: '#3366ff'}})
  .jpeg()
  .withExif({IFD0: {Copyright: 'secret location data'}})
  .toBuffer()

function upload() {
  return request(app).post('/auth/upload-avatar').set('Cookie', 'access_token=token').attach('avatar', photo, {filename: 'photo.jpg', contentType: 'image/jpeg'})
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('avatar upload', () => {
  it('re-encodes the image to a 512px WebP without metadata, then deletes the old avatar', async () => {
    const res = await upload()
    expect(res.status).toBe(200)

    const uploaded = vi.mocked(uploadImage).mock.calls[0]![0] as Buffer
    const metadata = await sharp(uploaded).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(512)
    expect(metadata.exif).toBeUndefined()

    expect(setAvatar).toHaveBeenCalledWith('user-1', {fileId: 'file_new', url: 'https://ik.example/avatars/new.webp'})
    await vi.waitFor(() => expect(deleteImage).toHaveBeenCalledWith('file_old'))
  })

  it('answers what auth-service answers for an ended session, without reading the file', async () => {
    vi.mocked(authenticate).mockRejectedValueOnce(ApiError.unauthorized('Session has ended, please sign in again'))
    const res = await upload()
    expect(res.status).toBe(401)
    expect(uploadImage).not.toHaveBeenCalled()

    const noCookie = await request(app).post('/auth/upload-avatar').attach('avatar', photo, {filename: 'photo.jpg', contentType: 'image/jpeg'})
    expect(noCookie.status).toBe(401)
    expect(authenticate).toHaveBeenCalledTimes(1)
  })

  it('deletes the new file when auth-service refuses the update', async () => {
    vi.mocked(setAvatar).mockRejectedValueOnce(ApiError.notFound('User not found'))
    const res = await upload()
    expect(res.status).toBe(404)
    await vi.waitFor(() => expect(deleteImage).toHaveBeenCalledWith('file_new'))
  })

  it('keeps the new file when auth-service may have saved it', async () => {
    vi.mocked(setAvatar).mockRejectedValueOnce(new ApiError(502, 'Authentication service is unavailable'))
    const res = await upload()
    expect(res.status).toBe(502)
    expect(deleteImage).not.toHaveBeenCalled()
  })

  it('refuses requests that did not come through the gateway', async () => {
    const res = await request(service).post('/auth/upload-avatar').set('Cookie', 'access_token=token').attach('avatar', photo, {filename: 'photo.jpg', contentType: 'image/jpeg'})
    expect(res.status).toBe(403)
    expect(authenticate).not.toHaveBeenCalled()
  })
})
