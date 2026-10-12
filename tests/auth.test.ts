import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Response } from 'supertest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import sharp from 'sharp'
import { eq, sql } from 'drizzle-orm'

// no real mail, breach lookups or image hosting during tests; each mock records what the app tried to send
vi.mock('../src/utils/mail.js', () => ({
  sendEmailVerificationMail: vi.fn(async () => {}),
  sendWelcomeMail: vi.fn(async () => {}),
  sendResetPasswordMail: vi.fn(async () => {}),
  sendAccountExistsMail: vi.fn(async () => {}),
  sendPasswordChangedMail: vi.fn(async () => {}),
}))
vi.mock('../src/utils/breached-password.js', () => ({
  isPasswordBreached: vi.fn(async () => false),
}))
vi.mock('../src/utils/imagekit.js', () => ({
  uploadImage: vi.fn(async () => ({fileId: 'file_test', url: 'https://ik.example/avatars/test.webp'})),
  deleteImage: vi.fn(async () => {}),
}))

import { createExpressApplication } from '../src/app/index.js'
import { db } from '../src/db/index.js'
import { sessionsTable, usersTable } from '../src/db/schema.js'
import * as mail from '../src/utils/mail.js'
import { isPasswordBreached } from '../src/utils/breached-password.js'
import { uploadImage } from '../src/utils/imagekit.js'

const app = createExpressApplication()
const PASSWORD = 'correct-horse-battery'

beforeEach(async () => {
  vi.clearAllMocks()
  await db.execute(sql`TRUNCATE ${usersTable}, ${sessionsTable} CASCADE`)
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(async () => {
  await db.$client.end()
})

function tokenFromUrl(url: string) {
  return new URL(url).searchParams.get('token')!
}

// the value of a cookie the response set (ignoring the ones it cleared)
function getCookie(res: Response, name: string) {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined
  const cookie = header?.find(c => c.startsWith(`${name}=`) && !c.startsWith(`${name}=;`))
  return cookie?.split(';')[0]?.slice(name.length + 1)
}

async function signUp(email: string, password = PASSWORD) {
  const res = await request(app).post('/auth/sign-up').send({firstName: 'Test', email, password})
  expect(res.status).toBe(201)
  const calls = vi.mocked(mail.sendEmailVerificationMail).mock.calls
  return tokenFromUrl(calls[calls.length - 1]![1])
}

async function createVerifiedUser(email: string, password = PASSWORD) {
  const token = await signUp(email, password)
  const res = await request(app).post(`/auth/verify-email/${token}`).send({password})
  expect(res.status).toBe(200)
}

async function signedInAgent(email: string, password = PASSWORD) {
  const agent = request.agent(app)
  const res = await agent.post('/auth/sign-in').send({email, password})
  expect(res.status).toBe(200)
  return {agent, res}
}

async function requestResetToken(email: string) {
  const res = await request(app).post('/auth/forgot-password').send({email})
  expect(res.status).toBe(200)
  // the link is issued after the response is sent
  await vi.waitFor(() => expect(mail.sendResetPasswordMail).toHaveBeenCalled())
  const calls = vi.mocked(mail.sendResetPasswordMail).mock.calls
  return tokenFromUrl(calls[calls.length - 1]![2])
}

describe('validation', () => {
  it('rejects an age outside the integer column with 400 instead of a database error', async () => {
    const res = await request(app).post('/auth/sign-up').send({firstName: 'Test', email: 'age@test.dev', password: PASSWORD, age: 3_000_000_000})
    expect(res.status).toBe(400)
  })

  it('caps new passwords at 72 bytes, not 72 characters', async () => {
    // 20 emoji are 20 characters but 80 bytes
    const res = await request(app).post('/auth/sign-up').send({firstName: 'Test', email: 'bytes@test.dev', password: '😀'.repeat(20)})
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('72 bytes')
  })

  it('rejects a password found in a breach', async () => {
    vi.mocked(isPasswordBreached).mockResolvedValueOnce(true)
    const res = await request(app).post('/auth/sign-up').send({firstName: 'Test', email: 'breached@test.dev', password: PASSWORD})
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('breach')
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/auth/sign-in').set('Content-Type', 'application/json').send('{"email":')
    expect(res.status).toBe(400)
  })

  it('refuses form and text bodies, so other sites cannot post to the api', async () => {
    const form = await request(app).post('/auth/sign-in').type('form').send({email: 'a@test.dev', password: PASSWORD})
    expect(form.status).toBe(415)
    const text = await request(app).post('/auth/sign-in').set('Content-Type', 'text/plain').send('hello')
    expect(text.status).toBe(415)
  })
})

describe('sign in', () => {
  it('gives the same answer, in a similar time, for an unknown email and a wrong password', async () => {
    await createVerifiedUser('known@test.dev')

    let start = performance.now()
    const unknown = await request(app).post('/auth/sign-in').send({email: 'unknown@test.dev', password: PASSWORD})
    const unknownMs = performance.now() - start

    start = performance.now()
    const wrong = await request(app).post('/auth/sign-in').send({email: 'known@test.dev', password: 'wrong-password'})
    const wrongMs = performance.now() - start

    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(unknown.body).toEqual(wrong.body)
    // both paths run one bcrypt compare; without the dummy compare the unknown email answers many times faster
    expect(unknownMs).toBeGreaterThan(wrongMs * 0.5)
  })

  it('upgrades a hash made with a lower cost', async () => {
    await db.insert(usersTable).values({firstName: 'Old', email: 'old@test.dev', emailVerified: true, password: await bcrypt.hash(PASSWORD, 10)})

    await signedInAgent('old@test.dev')

    const [user] = await db.select({password: usersTable.password}).from(usersTable).where(eq(usersTable.email, 'old@test.dev'))
    expect(bcrypt.getRounds(user!.password!)).toBe(12)
  })

  it('gives each device its own session', async () => {
    await createVerifiedUser('devices@test.dev')
    const laptop = await signedInAgent('devices@test.dev')
    const phone = await signedInAgent('devices@test.dev')

    expect((await laptop.agent.get('/auth/me')).status).toBe(200)
    expect((await phone.agent.get('/auth/me')).status).toBe(200)

    const list = await phone.agent.get('/auth/sessions')
    expect(list.body.data).toHaveLength(2)
    expect(list.body.data.filter((s: {current: boolean}) => s.current)).toHaveLength(1)
  })

  it('rejects access tokens issued before sessions existed', async () => {
    await createVerifiedUser('legacy@test.dev')
    const [user] = await db.select({id: usersTable.id}).from(usersTable).where(eq(usersTable.email, 'legacy@test.dev'))
    const legacyToken = jwt.sign({userId: user!.id}, process.env.ACCESS_TOKEN_SECRET_KEY!, {expiresIn: '15m'})

    const res = await request(app).get('/auth/me').set('Cookie', `access_token=${legacyToken}`)
    expect(res.status).toBe(401)
  })
})

describe('sessions', () => {
  it('ends the access token at logout, not when it expires', async () => {
    await createVerifiedUser('logout@test.dev')
    const {agent, res} = await signedInAgent('logout@test.dev')
    const accessToken = getCookie(res, 'access_token')

    expect((await agent.post('/auth/logout')).status).toBe(200)

    const replay = await request(app).get('/auth/me').set('Cookie', `access_token=${accessToken}`)
    expect(replay.status).toBe(401)
  })

  it('rotates the refresh token, tolerates a racing tab, and revokes the session when an old token is replayed later', async () => {
    await createVerifiedUser('rotate@test.dev')
    const {agent, res} = await signedInAgent('rotate@test.dev')
    const firstRefresh = getCookie(res, 'refresh_token')!

    expect((await agent.post('/auth/refresh')).status).toBe(200)

    // a second tab sending the token that was just replaced: rejected, but the session survives
    const race = await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${firstRefresh}`)
    expect(race.status).toBe(401)
    expect((await agent.get('/auth/me')).status).toBe(200)

    // the same old token well after the grace window means someone kept a copy
    vi.useFakeTimers({toFake: ['Date'], now: Date.now() + 11_000})
    const replay = await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${firstRefresh}`)
    expect(replay.status).toBe(401)
    expect((await agent.get('/auth/me')).status).toBe(401)
  })

  it('allows only one of two parallel refreshes with the same token', async () => {
    await createVerifiedUser('parallel@test.dev')
    const {res} = await signedInAgent('parallel@test.dev')
    const refreshToken = getCookie(res, 'refresh_token')!

    const results = await Promise.all([1, 2].map(() => request(app).post('/auth/refresh').set('Cookie', `refresh_token=${refreshToken}`)))
    expect(results.map(r => r.status).sort()).toEqual([200, 401])
  })

  it('revokes one chosen session, and only the owner can', async () => {
    await createVerifiedUser('owner@test.dev')
    await createVerifiedUser('other@test.dev')
    const laptop = await signedInAgent('owner@test.dev')
    const phone = await signedInAgent('owner@test.dev')
    const stranger = await signedInAgent('other@test.dev')

    const list = await laptop.agent.get('/auth/sessions')
    const phoneSession = list.body.data.find((s: {current: boolean}) => !s.current)

    expect((await stranger.agent.delete(`/auth/sessions/${phoneSession.id}`)).status).toBe(404)
    expect((await laptop.agent.delete(`/auth/sessions/${phoneSession.id}`)).status).toBe(200)
    expect((await phone.agent.get('/auth/me')).status).toBe(401)
    expect((await laptop.agent.get('/auth/me')).status).toBe(200)
  })

  it('signs out every device with logout-all', async () => {
    await createVerifiedUser('all@test.dev')
    const laptop = await signedInAgent('all@test.dev')
    const phone = await signedInAgent('all@test.dev')

    expect((await laptop.agent.post('/auth/logout-all')).status).toBe(200)
    expect((await laptop.agent.get('/auth/me')).status).toBe(401)
    expect((await phone.agent.get('/auth/me')).status).toBe(401)
  })
})

describe('passwords', () => {
  it('signs out other devices on change, keeps this one, and emails the owner', async () => {
    await createVerifiedUser('change@test.dev')
    const laptop = await signedInAgent('change@test.dev')
    const phone = await signedInAgent('change@test.dev')

    const res = await laptop.agent.post('/auth/change-password').send({currentPassword: PASSWORD, newPassword: 'a-brand-new-password'})
    expect(res.status).toBe(200)

    expect((await laptop.agent.get('/auth/me')).status).toBe(200)
    expect((await phone.agent.get('/auth/me')).status).toBe(401)
    expect(mail.sendPasswordChangedMail).toHaveBeenCalledTimes(1)
  })

  it('lets a reset link be used only once, even by two requests at the same time', async () => {
    await createVerifiedUser('reset@test.dev')
    const token = await requestResetToken('reset@test.dev')

    const results = await Promise.all(['first-new-password', 'second-new-password'].map(newPassword =>
      request(app).post(`/auth/reset-password/${token}`).send({newPassword})
    ))
    expect(results.map(r => r.status).sort()).toEqual([200, 404])
  })

  it('signs out every session on reset', async () => {
    await createVerifiedUser('reset-sessions@test.dev')
    const {agent} = await signedInAgent('reset-sessions@test.dev')
    const token = await requestResetToken('reset-sessions@test.dev')

    expect((await request(app).post(`/auth/reset-password/${token}`).send({newPassword: 'a-brand-new-password'})).status).toBe(200)
    expect((await agent.get('/auth/me')).status).toBe(401)
    expect(mail.sendPasswordChangedMail).toHaveBeenCalledTimes(1)
  })

  it('verifies the email when a reset is completed, since the link proves the inbox', async () => {
    await signUp('unverified@test.dev')
    const token = await requestResetToken('unverified@test.dev')

    expect((await request(app).post(`/auth/reset-password/${token}`).send({newPassword: 'a-brand-new-password'})).status).toBe(200)
    await signedInAgent('unverified@test.dev', 'a-brand-new-password')
  })

  it('sends at most one reset mail per cooldown, with the same response every time', async () => {
    await createVerifiedUser('cooldown@test.dev')

    const first = await request(app).post('/auth/forgot-password').send({email: 'cooldown@test.dev'})
    const second = await request(app).post('/auth/forgot-password').send({email: 'cooldown@test.dev'})
    const unknown = await request(app).post('/auth/forgot-password').send({email: 'nobody@test.dev'})

    expect(first.body).toEqual(second.body)
    expect(first.body).toEqual(unknown.body)
    await vi.waitFor(() => expect(mail.sendResetPasswordMail).toHaveBeenCalled())
    // give the second request's background work time to finish before counting
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(mail.sendResetPasswordMail).toHaveBeenCalledTimes(1)
  })
})

describe('avatar upload', () => {
  it('re-encodes the image to a 512px WebP without metadata', async () => {
    await createVerifiedUser('avatar@test.dev')
    const {agent} = await signedInAgent('avatar@test.dev')

    const photo = await sharp({create: {width: 1200, height: 900, channels: 3, background: '#3366ff'}})
      .jpeg()
      .withExif({IFD0: {Copyright: 'secret location data'}})
      .toBuffer()

    const res = await agent.post('/auth/upload-avatar').attach('avatar', photo, {filename: 'photo.jpg', contentType: 'image/jpeg'})
    expect(res.status).toBe(200)

    const uploaded = vi.mocked(uploadImage).mock.calls[0]![0] as Buffer
    const metadata = await sharp(uploaded).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(512)
    expect(metadata.exif).toBeUndefined()
  })
})
