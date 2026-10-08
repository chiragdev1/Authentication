import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { errorHandler } from '../../src/app/middlewares/error-handler.js'
import { ApiError } from '../../src/utils/api-error.js'

// Unit tests for src/app/middlewares/error-handler.ts.
// Every error thrown in a controller ends up here (Express 5 forwards rejected promises),
// so this decides what status and message the client sees.

// A minimal fake Express response: status() and json() record their arguments
function fakeResponse() {
  const res = {} as Response
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const req = {} as Request
const next = vi.fn() as NextFunction

describe('errorHandler', () => {
  it('uses the status and message of an ApiError', () => {
    const res = fakeResponse()
    errorHandler(ApiError.conflict('User with this email already exists'), req, res, next)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User with this email already exists' })
  })

  it('turns any other error into a generic 500 without leaking its message', () => {
    const res = fakeResponse()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    errorHandler(new Error('connection string postgres://secret@db'), req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal Server Error' })
    // the real error is still logged on the server for debugging
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
